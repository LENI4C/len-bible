"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { AppLoading } from "@/components/AppLoading";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Flame, BookOpen, Brain, Medal, Users } from "lucide-react";
import type { LeaderboardEntry } from "@/store/useProgressStore";

export default function LeaderboardPage() {
  const profile = useProgressStore((s) => s.profile);
  const { entries, loaded } = useLeaderboard();
  const [myRank, setMyRank] = useState<{ rank: number; total: number } | null>(null);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    void supabase.rpc("get_my_rank").then(({ data }) => {
      if (data?.rank != null) {
        setMyRank({ rank: Number(data.rank), total: Number(data.total) });
      }
    });
  }, [profile, entries]);

  if (!loaded) {
    return (
      <div role="status" aria-live="polite">
        <AppLoading />
      </div>
    );
  }

  const listRank =
    profile ? entries.findIndex((e) => e.id === profile.id) + 1 : 0;
  const displayRank = myRank?.rank ?? (listRank > 0 ? listRank : null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
        <h1 className="mb-2 text-3xl font-bold text-primary">Leaderboard</h1>
        <p className="text-muted">Readers across Len Bible</p>
        {displayRank != null && (
          <p className="mt-2 text-sm">
            Your rank:{" "}
            <span className="font-bold text-primary tabular-nums">#{displayRank}</span>
            {myRank ? (
              <span className="text-muted"> of {myRank.total}</span>
            ) : null}
          </p>
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
          <p className="text-sm text-muted">Complete chapters to join the global leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isUser = profile && entry.id === profile.id;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 rounded-xl p-4 ${
                  isUser ? "glass-card glow-primary border-primary/30" : "glass-card"
                }`}
              >
                <RankBadge rank={index + 1} />
                <span className="text-2xl" aria-hidden>
                  {entry.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {entry.username}
                    {isUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                  </p>
                  <div className="flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {entry.streak}d
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {entry.chaptersRead}
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="h-3 w-3" /> {entry.quizzesPassed}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-primary">
                    {entry.points.toLocaleString()}
                  </p>
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

function PodiumSpot({
  entry,
  rank,
  height,
  highlight,
}: {
  entry: LeaderboardEntry;
  rank: number;
  height: string;
  highlight?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-2xl" aria-hidden>
        {entry.avatar}
      </span>
      <p className={`mb-1 text-sm font-semibold ${highlight ? "text-primary" : ""}`}>
        {entry.username}
      </p>
      <p className="mb-2 text-xs text-muted tabular-nums">{entry.points.toLocaleString()} pts</p>
      <div
        className={`flex w-20 items-center justify-center rounded-t-xl ${height} ${
          highlight ? "bg-primary/20" : "bg-card"
        }`}
      >
        <span className="text-2xl" aria-hidden>
          {medals[rank - 1]}
        </span>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <Medal className="h-5 w-5 text-primary" aria-label={`Rank ${rank}`} />;
  }
  return (
    <span className="w-6 text-center text-sm font-bold tabular-nums text-muted">#{rank}</span>
  );
}
