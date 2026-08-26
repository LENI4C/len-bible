"use client";

import Link from "next/link";
import { useProgressStore } from "@/store/useProgressStore";
import { getChronologicalItems, getTotalChapters } from "@/lib/chronological-order";
import { getLevel } from "@/lib/points";
import { ProgressRing } from "@/components/ProgressRing";
import { ReadingReminder } from "@/components/ReadingReminder";
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
  const {
    profile,
    points,
    streak,
    longestStreak,
    readChapters,
    quizResults,
    version,
    lastReadDate,
  } = useProgressStore();

  const totalChapters = getTotalChapters();
  const chaptersRead = Object.keys(readChapters).length;
  const quizzesPassed = Object.values(quizResults).filter((r) => r.passed).length;
  const progressPct = Math.round((chaptersRead / totalChapters) * 100);
  const level = getLevel(points);
  const nextUnread = findNextChapter(readChapters);
  const readToday = lastReadDate === new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ReadingReminder streak={streak} readToday={readToday} />

      <section className="mb-8 text-center">
        <p className="mb-1 text-sm text-muted">
          Good {getGreeting()}, {profile?.username} {profile?.avatar}
        </p>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
          Continue Your <span className="gradient-text">Bible Journey</span>
        </h1>
        <p className="text-muted">Reading in chronological order · {version} translation</p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-warning" />}
          label="Current Streak"
          value={`${streak} days`}
          sub={`Best: ${longestStreak} days`}
          highlight={streak >= 7}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-primary" />}
          label="Total Points"
          value={points.toLocaleString()}
          sub={`Level ${level.level} · ${level.title}`}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-accent-light" />}
          label="Chapters Read"
          value={chaptersRead.toString()}
          sub={`of ${totalChapters} total`}
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-success" />}
          label="Quizzes Passed"
          value={quizzesPassed.toString()}
          sub={`${Math.round((quizzesPassed / Math.max(chaptersRead, 1)) * 100)}% pass rate`}
        />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Overall Progress</h2>
          <div className="flex items-center gap-6">
            <ProgressRing progress={progressPct} label={`${progressPct}%`} sublabel="complete" />
            <div className="flex-1 space-y-3">
              <ProgressBar label="Chronological Journey" value={progressPct} />
              <ProgressBar
                label="Quiz Completion"
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
            <h2 className="text-lg font-semibold">Continue Reading</h2>
          </div>
          {nextUnread ? (
            <>
              <p className="mb-1 text-2xl font-bold">{BIBLE_BOOKS[nextUnread.bookId].name}</p>
              <p className="mb-4 text-muted">Chapter {nextUnread.chapter}</p>
              <Link
                href={`/read/${nextUnread.bookId}/${nextUnread.chapter}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background hover:bg-primary-light"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <p className="mb-4 text-muted">You&apos;ve read every chapter! 🎉</p>
              <Link
                href="/journey"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"
              >
                View Journey
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
            <h3 className="font-semibold group-hover:text-primary">Reading Journey</h3>
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
            <p className="text-sm text-muted">Compare progress with other readers</p>
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
      <p className="text-2xl font-bold">{value}</p>
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
        <span className="font-medium">{value}%</span>
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
  readChapters: Record<string, boolean>
): { bookId: string; chapter: number } | null {
  for (const bookId of CHRONOLOGICAL_ORDER) {
    const book = BIBLE_BOOKS[bookId];
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (!readChapters[chapterKey(bookId, ch)]) {
        return { bookId, chapter: ch };
      }
    }
  }
  return null;
}
