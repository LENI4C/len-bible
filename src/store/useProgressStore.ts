"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chapterKey } from "@/lib/books";
import { DEFAULT_VERSION } from "@/lib/bible-versions";
import { localDateString } from "@/lib/points";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  failedQuestions: number[];
  pointsEarned: number;
  completedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  points: number;
  streak: number;
  chaptersRead: number;
  quizzesPassed: number;
}

interface ProgressState {
  authUser: User | null;
  profile: UserProfile | null;
  hydrated: boolean;
  version: string;
  points: number;
  streak: number;
  longestStreak: number;
  lastReadDate: string | null;
  readChapters: Record<string, boolean>;
  quizResults: Record<string, QuizResult>;
  bookSummariesSeen: Record<string, boolean>;

  setAuthUser: (user: User | null) => void;
  loadFromSupabase: () => Promise<void>;
  createProfile: (username: string, avatar: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  setVersion: (version: string) => void;
  markChapterRead: (bookId: string, chapter: number) => Promise<number>;
  saveQuizResult: (
    bookId: string,
    chapter: number,
    answers: { question_id: number; selected_index: number }[]
  ) => Promise<{
    score: number;
    total: number;
    passed: boolean;
    failed: number[];
    points: number;
    streakBonus: number;
    streak: number;
    review: {
      question_id: number;
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
      review_verse: string;
    }[];
  }>;
  applyStreakFreeze: () => Promise<{ ok: boolean; error?: string; freezes?: number }>;
  markSummarySeen: (bookId: string) => void;
  getChaptersReadCount: () => number;
  getQuizzesPassedCount: () => number;
  dailyGoalMetDate: string | null;
  streakFreezes: number;
}

function mapQuizRow(row: {
  book_id: string;
  chapter: number;
  score: number;
  total: number;
  passed: boolean;
  failed_questions: number[];
  points_earned: number;
  completed_at: string;
}): [string, QuizResult] {
  const key = chapterKey(row.book_id, row.chapter);
  return [
    key,
    {
      score: row.score,
      total: row.total,
      passed: row.passed,
      failedQuestions: row.failed_questions ?? [],
      pointsEarned: row.points_earned,
      completedAt: row.completed_at,
    },
  ];
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      authUser: null,
      profile: null,
      hydrated: false,
      version: DEFAULT_VERSION,
      points: 0,
      streak: 0,
      longestStreak: 0,
      lastReadDate: null,
      dailyGoalMetDate: null,
      streakFreezes: 1,
      readChapters: {},
      quizResults: {},
      bookSummariesSeen: {},

      setAuthUser: (user) => set({ authUser: user }),

      loadFromSupabase: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        set({ authUser: user });

        if (!user) {
          set({
            profile: null,
            hydrated: true,
            readChapters: {},
            quizResults: {},
            points: 0,
            streak: 0,
            longestStreak: 0,
            lastReadDate: null,
            dailyGoalMetDate: null,
            streakFreezes: 1,
          });
          return;
        }

        const { data: profileRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileRow) {
          set({ profile: null, hydrated: true });
          return;
        }

        const [progressRes, quizRes] = await Promise.all([
          supabase.from("reading_progress").select("book_id, chapter").eq("user_id", user.id),
          supabase.from("quiz_results").select("*").eq("user_id", user.id),
        ]);

        const readChapters: Record<string, boolean> = {};
        for (const row of progressRes.data ?? []) {
          readChapters[chapterKey(row.book_id, row.chapter)] = true;
        }

        const quizResults: Record<string, QuizResult> = {};
        for (const row of quizRes.data ?? []) {
          const [key, result] = mapQuizRow(row as Parameters<typeof mapQuizRow>[0]);
          quizResults[key] = result;
        }

        set({
          profile: {
            id: profileRow.id,
            username: profileRow.username,
            avatar: profileRow.avatar,
            createdAt: profileRow.created_at,
          },
          points: profileRow.points,
          streak: profileRow.streak,
          longestStreak: profileRow.longest_streak,
          lastReadDate: profileRow.last_read_date,
          dailyGoalMetDate: profileRow.daily_goal_met_date ?? null,
          streakFreezes: profileRow.streak_freezes ?? 1,
          readChapters,
          quizResults,
          hydrated: true,
        });
      },

      createProfile: async (username, avatar) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return "Not signed in";

        const { error } = await supabase.from("profiles").insert({
          id: user.id,
          username: username.trim(),
          avatar,
        });

        if (error) {
          if (error.code === "23505") return "Username already taken";
          return error.message;
        }

        await get().loadFromSupabase();
        return null;
      },

      signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        set({
          authUser: null,
          profile: null,
          points: 0,
          streak: 0,
          longestStreak: 0,
          lastReadDate: null,
          dailyGoalMetDate: null,
          streakFreezes: 1,
          readChapters: {},
          quizResults: {},
        });
      },

      setVersion: (version) => set({ version }),

      markChapterRead: async (bookId, chapter) => {
        const key = chapterKey(bookId, chapter);
        if (get().readChapters[key]) return 0;

        const supabase = createClient();
        const { data, error } = await supabase.rpc("mark_chapter_read", {
          p_book_id: bookId,
          p_chapter: chapter,
        });

        if (error) throw new Error(error.message);

        const earned = (data?.points_earned as number) ?? 0;
        await get().loadFromSupabase();
        return earned;
      },

      saveQuizResult: async (bookId, chapter, answers) => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("submit_quiz_answers", {
          p_book_id: bookId,
          p_chapter: chapter,
          p_answers: answers,
          p_local_date: localDateString(),
        });

        if (error) throw new Error(error.message);

        const failedIds = (data?.failed_question_ids as number[]) ?? [];
        const failed = failedIds.map((id) => id - 1);

        await get().loadFromSupabase();

        return {
          score: data?.score as number,
          total: data?.total as number,
          passed: data?.passed as boolean,
          failed,
          points: ((data?.points_delta as number) ?? 0) + ((data?.streak_bonus as number) ?? 0),
          streakBonus: (data?.streak_bonus as number) ?? 0,
          streak: (data?.streak as number) ?? get().streak,
          review: (data?.review as {
            question_id: number;
            question: string;
            options: string[];
            correct_index: number;
            explanation: string;
            review_verse: string;
          }[]) ?? [],
        };
      },

      applyStreakFreeze: async () => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("use_streak_freeze", {
          p_local_date: localDateString(),
        });
        if (error) return { ok: false, error: error.message };
        await get().loadFromSupabase();
        return {
          ok: Boolean(data?.ok),
          error: data?.error as string | undefined,
          freezes: data?.streak_freezes as number | undefined,
        };
      },

      markSummarySeen: (bookId) =>
        set((s) => ({
          bookSummariesSeen: { ...s.bookSummariesSeen, [bookId]: true },
        })),

      getChaptersReadCount: () => Object.keys(get().readChapters).length,

      getQuizzesPassedCount: () =>
        Object.values(get().quizResults).filter((r) => r.passed).length,
    }),
    {
      name: "len-bible-prefs",
      partialize: (s) => ({
        version: s.version,
        bookSummariesSeen: s.bookSummariesSeen,
      }),
    }
  )
);

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: 50 });
  if (error || !data) return [];

  return (data as {
    id: string;
    username: string;
    avatar: string;
    points: number;
    streak: number;
    chapters_read: number;
    quizzes_passed: number;
  }[]).map((p) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    points: p.points,
    streak: p.streak,
    chaptersRead: Number(p.chapters_read),
    quizzesPassed: Number(p.quizzes_passed),
  }));
}
