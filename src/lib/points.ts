export const POINTS = {
  CHAPTER_READ: 10,
  QUIZ_PASS: 25,
  QUIZ_PERFECT: 15, // bonus for 100%
  STREAK_BONUS_PER_DAY: 2,
  STREAK_BONUS_CAP: 20,
} as const;

/** Single source of truth — keep SQL RPC in sync (0.7). */
export const PASS_THRESHOLD = 0.7;

export const LEVEL_THRESHOLDS = [
  { level: 1, title: "Seeker", at: 0 },
  { level: 2, title: "Reader", at: 100 },
  { level: 3, title: "Student", at: 500 },
  { level: 4, title: "Scholar", at: 1500 },
  { level: 5, title: "Disciple", at: 3500 },
  { level: 6, title: "Teacher", at: 7000 },
  { level: 7, title: "Elder", at: 12000 },
  { level: 8, title: "Sage", at: 20000 },
] as const;

/** Local calendar date YYYY-MM-DD for streak RPCs. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calculateQuizPoints(
  score: number,
  total: number,
  passed: boolean
): number {
  if (!passed) return 0;
  let points = POINTS.QUIZ_PASS;
  if (score === total) {
    points += POINTS.QUIZ_PERFECT;
  }
  return points;
}

export function calculateStreakBonus(streakDays: number): number {
  return Math.min(
    streakDays * POINTS.STREAK_BONUS_PER_DAY,
    POINTS.STREAK_BONUS_CAP
  );
}

export function getLevel(points: number): { level: number; title: string; nextAt: number; at: number } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].at) {
      const next = LEVEL_THRESHOLDS[i + 1];
      return {
        level: LEVEL_THRESHOLDS[i].level,
        title: LEVEL_THRESHOLDS[i].title,
        nextAt: next?.at ?? LEVEL_THRESHOLDS[i].at,
        at: LEVEL_THRESHOLDS[i].at,
      };
    }
  }
  return { level: 1, title: "Seeker", nextAt: 100, at: 0 };
}
