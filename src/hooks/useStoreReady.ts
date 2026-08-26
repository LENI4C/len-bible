"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";

/** Wait until zustand has rehydrated from localStorage. */
export function useStoreReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const markReady = () => setReady(true);

    // Trigger rehydration explicitly (required in some Next.js setups)
    void useProgressStore.persist.rehydrate();

    if (useProgressStore.persist.hasHydrated()) {
      markReady();
      return;
    }

    const unsub = useProgressStore.persist.onFinishHydration(markReady);

    // Safety fallback — never leave the user on a blank loading screen
    const timeout = setTimeout(markReady, 1500);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  return ready;
}
