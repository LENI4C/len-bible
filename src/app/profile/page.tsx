"use client";

import { useProgressStore } from "@/store/useProgressStore";
import { getLevel } from "@/lib/points";
import { getTotalChapters } from "@/lib/chronological-order";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { ProgressRing } from "@/components/ProgressRing";
import { Flame, Star, BookOpen, Brain, Award, Settings2 } from "lucide-react";

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 3500, 7000, 12000, 20000];

export default function ProfilePage() {
  const {
    profile,
    points,
    streak,
    longestStreak,
    version,
    setVersion,
    getChaptersReadCount,
    getQuizzesPassedCount,
  } = useProgressStore();

  if (!profile) return null;

  const level = getLevel(points);
  const totalChapters = getTotalChapters();
  const chaptersRead = getChaptersReadCount();
  const quizzesPassed = getQuizzesPassedCount();
  const progressPct = Math.round((chaptersRead / totalChapters) * 100);
  const prevThreshold = LEVEL_THRESHOLDS[level.level - 1] ?? 0;
  const levelProgress =
    level.level >= 8 ? 100 : Math.round(((points - prevThreshold) / (level.nextAt - prevThreshold)) * 100);

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-block text-6xl">{profile.avatar}</span>
        <h1 className="text-2xl font-bold">{profile.username}</h1>
        <p className="text-muted">Member since {memberSince}</p>
      </div>

      <div className="glass-card mb-6 flex items-center gap-6 rounded-2xl p-6">
        <ProgressRing progress={levelProgress} size={100} label={`Lv.${level.level}`} sublabel={level.title} />
        <div className="flex-1">
          <p className="mb-1 font-semibold">{level.title}</p>
          <p className="mb-2 text-sm text-muted">{points.toLocaleString()} / {level.nextAt.toLocaleString()} pts to next level</p>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(levelProgress, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <MiniStat icon={<Flame className="h-4 w-4 text-warning" />} label="Streak" value={`${streak} days`} />
        <MiniStat icon={<Award className="h-4 w-4 text-primary" />} label="Best Streak" value={`${longestStreak} days`} />
        <MiniStat icon={<BookOpen className="h-4 w-4 text-accent-light" />} label="Chapters" value={`${chaptersRead}/${totalChapters}`} />
        <MiniStat icon={<Brain className="h-4 w-4 text-success" />} label="Quizzes" value={quizzesPassed.toString()} />
        <MiniStat icon={<Star className="h-4 w-4 text-primary" />} label="Points" value={points.toLocaleString()} colSpan />
        <MiniStat icon={<BookOpen className="h-4 w-4 text-muted" />} label="Progress" value={`${progressPct}%`} colSpan />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Bible Version</h2>
        </div>
        <div className="grid gap-2">
          {BIBLE_VERSIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVersion(v.id)}
              className={`flex items-center justify-between rounded-xl p-3 text-left ${
                version === v.id ? "bg-primary/15 border border-primary/30" : "bg-card hover:bg-card-hover"
              }`}
            >
              <div>
                <p className="font-medium">{v.abbreviation}</p>
                <p className="text-xs text-muted">{v.fallbackName}</p>
              </div>
              {version === v.id && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-background">Active</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, colSpan }: { icon: React.ReactNode; label: string; value: string; colSpan?: boolean }) {
  return (
    <div className={`glass-card rounded-xl p-4 ${colSpan ? "col-span-2" : ""}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">{icon}{label}</div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
