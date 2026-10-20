"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProgressStore } from "@/store/useProgressStore";
import { getChronologicalItems, getTotalChapters } from "@/lib/chronological-order";
import { getLevel, localDateString } from "@/lib/points";
import { ProgressRing } from "@/components/ProgressRing";
import { ReadingReminder } from "@/components/ReadingReminder";
import { AppLoading } from "@/components/AppLoading";
import {
  Flame,
  Star,
  BookOpen,
  Brain,
  ChevronRight,
  Trophy,
  Zap,
} from "lucide-react";
import { chapterKey } from "@/lib/books";
import { CHRONOLOGICAL_ORDER } from "@/lib/chronological-order";
import { BIBLE_BOOKS } from "@/lib/books";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-live="polite">
          <AppLoading />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const {
    profile,
    points,
    streak,
    longestStreak,
    readChapters,
    quizResults,
    version,
    dailyGoalMetDate,
    streakFreezes,
    applyStreakFreeze,
  } = useProgressStore();

  const [freezeBusy, setFreezeBusy] = useState(false);
  const [freezeMsg, setFreezeMsg] = useState("");
  const authError = searchParams.get("auth") === "error";

  const totalChapters = getTotalChapters();
  const chaptersRead = Object.keys(readChapters).length;
  const quizzesPassed = Object.values(quizResults).filter((r) => r.passed).length;
  const progressPct = Math.round((chaptersRead / totalChapters) * 100);
  const level = getLevel(points);
  const nextUnread = findNextChapter(readChapters, quizResults);
  const today = localDateString();
  const goalMetToday = dailyGoalMetDate === today;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {authError && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          Sign-in link failed or expired. Request a new magic link from the welcome screen.
        </div>
      )}
      {freezeMsg && (
        <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm" role="status">
          {freezeMsg}
        </div>
      )}

      <ReadingReminder
        streak={streak}
        goalMetToday={goalMetToday}
        streakFreezes={streakFreezes}
        freezeBusy={freezeBusy}
        onUseFreeze={async () => {
          setFreezeBusy(true);
          const res = await applyStreakFreeze();
          setFreezeBusy(false);
          if (res.ok) setFreezeMsg("Streak freeze applied. Pass a quiz tomorrow to continue.");
          else if (res.error === "not_needed") setFreezeMsg("Your streak does not need a freeze right now.");
          else if (res.error === "no_freezes") setFreezeMsg("No streak freezes left this week.");
          else setFreezeMsg(res.error ?? "Could not apply freeze.");
        }}
      />

      <section className="mb-8 text-center">
        <p className="mb-1 text-sm text-muted">
          Good {getGreeting()}, {profile?.username}{" "}
          <span aria-hidden>{profile?.avatar}</span>
        </p>
        <h1 className="mb-2 text-balance text-3xl font-bold sm:text-4xl">
          Continue your <span className="text-primary">Bible journey</span>
        </h1>
        <p className="text-muted">Reading in chronological order · {version}</p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-warning" />}
          label="Current streak"
          value={`${streak} days`}
          sub={`Best: ${longestStreak} days`}
          highlight={streak >= 7}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-primary" />}
          label="Total points"
          value={points.toLocaleString()}
          sub={`Level ${level.level} · ${level.title}`}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-accent-light" />}
          label="Chapters read"
          value={chaptersRead.toString()}
          sub={`of ${totalChapters} total`}
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-success" />}
          label="Quizzes passed"
          value={quizzesPassed.toString()}
          sub={`${Math.round((quizzesPassed / Math.max(chaptersRead, 1)) * 100)}% of reads`}
        />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Overall progress</h2>
          <div className="flex items-center gap-6">
            <ProgressRing progress={progressPct} label={`${progressPct}%`} sublabel="complete" />
            <div className="flex-1 space-y-3">
              <ProgressBar label="Chronological journey" value={progressPct} />
              <ProgressBar
                label="Quiz completion"
                value={Math.round((quizzesPassed / Math.max(chaptersRead, 1)) * 100)}
                color="success"
              />
              <p className="text-xs text-muted">
                {getChronologicalItems().length} books · {totalChapters} chapters
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card glow-primary rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Continue reading</h2>
          </div>
          {nextUnread ? (
            <>
              <p className="mb-1 text-2xl font-bold">{BIBLE_BOOKS[nextUnread.bookId].name}</p>
              <p className="mb-4 text-muted">
                Chapter {nextUnread.chapter}
                {nextUnread.needsQuiz ? " · finish the quiz to move on" : ""}
              </p>
              <Link
                href={
                  nextUnread.needsQuiz
                    ? `/quiz/${nextUnread.bookId}/${nextUnread.chapter}`
                    : `/read/${nextUnread.bookId}/${nextUnread.chapter}`
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background hover:bg-primary-light"
              >
                {nextUnread.needsQuiz ? "Take quiz" : "Continue"}
                <ChevronRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <p className="mb-4 text-muted">You&apos;ve finished every chapter.</p>
              <Link
                href="/journey"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"
              >
                View journey
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/journey"
          className="glass-card group flex items-center gap-4 rounded-2xl p-5 hover:bg-card-hover"
        >
          <div className="rounded-xl bg-primary/10 p-3">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-primary">Reading journey</h3>
            <p className="text-sm text-muted">Browse all 66 books in chronological order</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
        <Link
          href="/leaderboard"
          className="glass-card group flex items-center gap-4 rounded-2xl p-5 hover:bg-card-hover"
        >
          <div className="rounded-xl bg-warning/10 p-3">
            <Trophy className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold group-hover:text-primary">Leaderboard</h3>
            <p className="text-sm text-muted">See how you rank among readers</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${highlight ? "animate-pulse-glow border-primary/30" : ""}`}>
      <div className="mb-2 flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  color = "primary",
}: {
  label: string;
  value: number;
  color?: "primary" | "success";
}) {
  const bg = color === "success" ? "bg-success" : "bg-primary";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${bg} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function findNextChapter(
  readChapters: Record<string, boolean>,
  quizResults: Record<string, { passed: boolean }>
): { bookId: string; chapter: number; needsQuiz: boolean } | null {
  for (const bookId of CHRONOLOGICAL_ORDER) {
    const book = BIBLE_BOOKS[bookId];
    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = chapterKey(bookId, ch);
      if (!readChapters[key]) {
        return { bookId, chapter: ch, needsQuiz: false };
      }
      if (!quizResults[key]?.passed) {
        return { bookId, chapter: ch, needsQuiz: true };
      }
    }
  }
  return null;
}
