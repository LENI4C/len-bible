"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProgressStore } from "@/store/useProgressStore";

/** Wait until auth session and Supabase profile/progress are loaded. */
export function useStoreReady() {
  const [ready, setReady] = useState(false);
  const loadFromSupabase = useProgressStore((s) => s.loadFromSupabase);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await loadFromSupabase();
      if (!cancelled) setReady(true);
    };

    void init();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadFromSupabase();
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 3000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [loadFromSupabase]);

  return ready;
}
