"use client";

import { useEffect, useRef, useState } from "react";
import { getLevel } from "@/lib/points";
import { useProgressStore } from "@/store/useProgressStore";

export function LevelUpToast() {
  const points = useProgressStore((s) => s.points);
  const prevLevel = useRef<number | null>(null);
  const [show, setShow] = useState<{ level: number; title: string } | null>(null);

  useEffect(() => {
    const level = getLevel(points);
    if (prevLevel.current === null) {
      prevLevel.current = level.level;
      return;
    }
    if (level.level > prevLevel.current) {
      setShow({ level: level.level, title: level.title });
      prevLevel.current = level.level;
      const t = setTimeout(() => setShow(null), 4000);
      return () => clearTimeout(t);
    }
    prevLevel.current = level.level;
  }, [points]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[90] w-[min(90vw,22rem)] -translate-x-1/2 rounded-2xl border border-primary/40 bg-card px-4 py-3 shadow-lg sm:bottom-8"
    >
      <p className="text-sm font-semibold text-primary">Level up</p>
      <p className="text-foreground">
        You reached Level {show.level} — {show.title}
      </p>
    </div>
  );
}
