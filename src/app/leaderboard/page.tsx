"use client";

import { useProgressStore, getLeaderboard } from "@/store/useProgressStore";
import { useStoreReady } from "@/hooks/useStoreReady";
import { AppLoading } from "@/components/AppLoading";
import { Trophy, Flame, BookOpen, Brain, Medal, Users } from "lucide-react";
import type { LeaderboardEntry } from "@/store/useProgressStore";

export default function LeaderboardPage() {
  const profile = useProgressStore((s) => s.profile);
  const ready = useStoreReady();
  const entries = ready ? getLeaderboard() : [];

  if (!ready) return <AppLoading />;

  const userRank =
    profile
      ? entries.findIndex((e) => e.username.toLowerCase() === profile.username.toLowerCase()) + 1
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="mb-2 text-3xl font-bold"><span className="gradient-text">Leaderboard</span></h1>
        <p className="text-muted">Real progress from readers on this device</p>
        {userRank > 0 && (
          <p className="mt-2 text-sm">Your rank: <span className="font-bold text-primary">#{userRank}</span></p>
        )}
      </div>

      {entries.length >= 3 && (
        <div className="mb-8 flex items-end justify-center gap-4">
          <PodiumSpot entry={entries[1]} rank={2} height="h-24" />
          <PodiumSpot entry={entries[0]} rank={1} height="h-32" highlight />
          <PodiumSpot entry={entries[2]} rank={3} height="h-20" />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="mb-2 text-lg font-semibold">No readers yet</p>
          <p className="text-sm text-muted">Complete chapters to appear here. Each username on this browser gets tracked.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isUser = profile && entry.username.toLowerCase() === profile.username.toLowerCase();
            return (
              <div key={entry.username} className={`flex items-center gap-4 rounded-xl p-4 ${isUser ? "glass-card glow-primary border-primary/30" : "glass-card"}`}>
                <RankBadge rank={index + 1} />
                <span className="text-2xl">{entry.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{entry.username}{isUser && <span className="ml-2 text-xs text-primary">(You)</span>}</p>
                  <div className="flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {entry.streak}d</span>
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {entry.chaptersRead}</span>
                    <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {entry.quizzesPassed}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{entry.points.toLocaleString()}</p>
                  <p className="text-xs text-muted">points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PodiumSpot({ entry, rank, height, highlight }: { entry: LeaderboardEntry; rank: number; height: string; highlight?: boolean }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-2xl">{entry.avatar}</span>
      <p className={`mb-1 text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{entry.username}</p>
      <p className="mb-2 text-xs text-muted">{entry.points.toLocaleString()} pts</p>
      <div className={`flex ${height} w-20 items-start justify-center rounded-t-xl pt-2 ${highlight ? "bg-primary/20" : "bg-card"}`}>
        <span className="text-xl">{medals[rank - 1]}</span>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
    return <Medal className={`h-5 w-5 ${colors[rank - 1]}`} />;
  }
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-sm font-bold text-muted">{rank}</span>;
}
