export const POINTS = {
  CHAPTER_READ: 10,
  QUIZ_PASS: 25,
  QUIZ_PERFECT: 15, // bonus for 100%
  STREAK_BONUS_PER_DAY: 2,
  STREAK_BONUS_CAP: 20,
} as const;

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

export function getLevel(points: number): { level: number; title: string; nextAt: number } {
  const thresholds = [
    { level: 1, title: "Seeker", at: 0 },
    { level: 2, title: "Reader", at: 100 },
    { level: 3, title: "Student", at: 500 },
    { level: 4, title: "Scholar", at: 1500 },
    { level: 5, title: "Disciple", at: 3500 },
    { level: 6, title: "Teacher", at: 7000 },
    { level: 7, title: "Elder", at: 12000 },
    { level: 8, title: "Sage", at: 20000 },
  ];

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i].at) {
      const next = thresholds[i + 1];
      return {
        level: thresholds[i].level,
        title: thresholds[i].title,
        nextAt: next?.at ?? thresholds[i].at,
      };
    }
  }
  return { level: 1, title: "Seeker", nextAt: 100 };
}
