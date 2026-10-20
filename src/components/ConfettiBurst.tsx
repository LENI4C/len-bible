"use client";

import { useMemo } from "react";

const COLORS = ["#d4a853", "#e8c47a", "#6b4c9a", "#8b6cb8", "#4ade80", "#f0ebe3"];

export function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return [];
    }
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: (i * 17) % 100,
      delay: (i % 8) * 0.05,
      color: COLORS[i % COLORS.length],
      size: 6 + (i % 5),
    }));
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
