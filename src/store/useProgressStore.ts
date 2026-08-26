"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chapterKey } from "@/lib/books";
import {
  POINTS,
  calculateQuizPoints,
  calculateStreakBonus,
} from "@/lib/points";
import { DEFAULT_VERSION } from "@/lib/bible-versions";

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  failedQuestions: number[];
  pointsEarned: number;
  completedAt: string;
}

export interface UserProfile {
  username: string;
  avatar: string;
  createdAt: string;
}

interface ProgressState {
  profile: UserProfile | null;
  version: string;
  points: number;
  streak: number;
  longestStreak: number;
  lastReadDate: string | null;
  readChapters: Record<string, boolean>;
  quizResults: Record<string, QuizResult>;
  bookSummariesSeen: Record<string, boolean>;

  setProfile: (username: string) => void;
  setVersion: (version: string) => void;
  markChapterRead: (bookId: string, chapter: number) => number;
  saveQuizResult: (
    bookId: string,
    chapter: number,
    score: number,
    total: number,
    failedQuestions: number[]
  ) => number;
  markSummarySeen: (bookId: string) => void;
  updateStreak: () => void;
  getChaptersReadCount: () => number;
  getQuizzesPassedCount: () => number;
}

const PASS_THRESHOLD = 0.7;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const AVATARS = ["📖", "✝️", "🕊️", "🌟", "🔥", "💎", "🙏", "⚡"];

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      profile: null,
      version: DEFAULT_VERSION,
      points: 0,
      streak: 0,
      longestStreak: 0,
      lastReadDate: null,
      readChapters: {},
      quizResults: {},
      bookSummariesSeen: {},

      setProfile: (username) => {
        set({
          profile: {
            username,
            avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
            createdAt: new Date().toISOString(),
          },
        });
        syncLeaderboard(get());
      },

      setVersion: (version) => set({ version }),

      updateStreak: () => {
        const { lastReadDate, streak, longestStreak } = get();
        const today = todayStr();
        if (lastReadDate === today) return;

        let newStreak = streak;
        if (lastReadDate === yesterdayStr()) {
          newStreak = streak + 1;
        } else if (lastReadDate !== today) {
          newStreak = 1;
        }

        set({
          streak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastReadDate: today,
        });
      },

      markChapterRead: (bookId, chapter) => {
        const key = chapterKey(bookId, chapter);
        const { readChapters, points } = get();
        if (readChapters[key]) return 0;

        get().updateStreak();
        const streakBonus = calculateStreakBonus(get().streak);
        const earned = POINTS.CHAPTER_READ + streakBonus;

        set({
          readChapters: { ...readChapters, [key]: true },
          points: points + earned,
        });
        syncLeaderboard(get());
        return earned;
      },

      saveQuizResult: (bookId, chapter, score, total, failedQuestions) => {
        const key = chapterKey(bookId, chapter);
        const passed = score / total >= PASS_THRESHOLD;
        const pointsEarned = calculateQuizPoints(score, total, passed);
        const result: QuizResult = {
          score,
          total,
          passed,
          failedQuestions,
          pointsEarned,
          completedAt: new Date().toISOString(),
        };

        const { quizResults, points } = get();
        const prev = quizResults[key];
        const additionalPoints =
          !prev || pointsEarned > (prev.pointsEarned ?? 0)
            ? pointsEarned - (prev?.pointsEarned ?? 0)
            : 0;

        set({
          quizResults: { ...quizResults, [key]: result },
          points: points + Math.max(0, additionalPoints),
        });
        syncLeaderboard(get());
        return pointsEarned;
      },

      markSummarySeen: (bookId) =>
        set((s) => ({
          bookSummariesSeen: { ...s.bookSummariesSeen, [bookId]: true },
        })),

      getChaptersReadCount: () =>
        Object.keys(get().readChapters).length,

      getQuizzesPassedCount: () =>
        Object.values(get().quizResults).filter((r) => r.passed).length,
    }),
    { name: "len-bible-progress" }
  )
);

function syncLeaderboard(state: ProgressState) {
  if (!state.profile || typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("len-bible-leaderboard");
    const board: Record<string, LeaderboardEntry> = stored
      ? JSON.parse(stored)
      : {};

    const id = state.profile.username.toLowerCase();
    board[id] = {
      username: state.profile.username,
      avatar: state.profile.avatar,
      points: state.points,
      streak: state.streak,
      chaptersRead: Object.keys(state.readChapters).length,
      quizzesPassed: Object.values(state.quizResults).filter((r) => r.passed)
        .length,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("len-bible-leaderboard", JSON.stringify(board));
  } catch {
    // ignore storage errors
  }
}

export interface LeaderboardEntry {
  username: string;
  avatar: string;
  points: number;
  streak: number;
  chaptersRead: number;
  quizzesPassed: number;
  updatedAt: string;
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("len-bible-leaderboard");
    const board: Record<string, LeaderboardEntry> = stored
      ? JSON.parse(stored)
      : {};
    return Object.values(board).sort((a, b) => b.points - a.points);
  } catch {
    return [];
  }
}
