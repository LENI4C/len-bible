"use client";

import { Bell, Flame, Shield } from "lucide-react";

interface ReadingReminderProps {
  streak: number;
  goalMetToday: boolean;
  streakFreezes: number;
  onUseFreeze?: () => void;
  freezeBusy?: boolean;
}

export function ReadingReminder({
  streak,
  goalMetToday,
  streakFreezes,
  onUseFreeze,
  freezeBusy,
}: ReadingReminderProps) {
  if (goalMetToday) {
    return (
      <div className="glass-card mb-6 flex items-center gap-4 rounded-2xl border-success/20 p-4">
        <div className="rounded-full bg-success/15 p-3">
          <Flame className="h-5 w-5 text-success" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-success">Daily goal complete</p>
          <p className="text-sm text-muted">
            You passed a quiz today · {streak}-day streak
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card mb-6 flex flex-col gap-3 rounded-2xl border-warning/20 p-4 sm:flex-row sm:items-center animate-pulse-glow">
      <div className="flex flex-1 items-center gap-4">
        <div className="rounded-full bg-warning/15 p-3">
          <Bell className="h-5 w-5 text-warning" aria-hidden />
        </div>
        <div>
          <p className="font-semibold">Daily goal: pass one quiz</p>
          <p className="text-sm text-muted">
            {streak > 0
              ? `Finish a chapter quiz today to keep your ${streak}-day streak.`
              : "Read a chapter and pass its quiz to start a streak."}
          </p>
        </div>
      </div>
      {streak > 0 && streakFreezes > 0 && onUseFreeze && (
        <button
          type="button"
          disabled={freezeBusy}
          onClick={onUseFreeze}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-card-hover disabled:opacity-50"
        >
          <Shield className="h-3.5 w-3.5 text-primary" />
          Use freeze ({streakFreezes})
        </button>
      )}
    </div>
  );
}
