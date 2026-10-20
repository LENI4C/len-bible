"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchLeaderboard, LeaderboardEntry } from "@/store/useProgressStore";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchLeaderboard();
    setEntries(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const data = await fetchLeaderboard();
      if (!cancelled) {
        setEntries(data);
        setLoaded(true);
      }
    };

    void run();

    const supabase = createClient();
    const channel = supabase
      .channel("leaderboard-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => { void refresh(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { entries, loaded, refresh };
}
