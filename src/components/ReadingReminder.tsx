"use client";

import { Bell, Flame } from "lucide-react";

interface ReadingReminderProps {
  streak: number;
  readToday: boolean;
}

export function ReadingReminder({ streak, readToday }: ReadingReminderProps) {
  if (readToday) {
    return (
      <div className="glass-card mb-6 flex items-center gap-4 rounded-2xl border-success/20 p-4">
        <div className="rounded-full bg-success/15 p-3">
          <Flame className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="font-semibold text-success">Streak secured for today!</p>
          <p className="text-sm text-muted">
            You&apos;ve read today · {streak}-day streak
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card mb-6 flex items-center gap-4 rounded-2xl border-warning/20 p-4 animate-pulse-glow">
      <div className="rounded-full bg-warning/15 p-3">
        <Bell className="h-5 w-5 text-warning" />
      </div>
      <div>
        <p className="font-semibold">Daily reading reminder</p>
        <p className="text-sm text-muted">
          {streak > 0
            ? `Read a chapter today to keep your ${streak}-day streak alive!`
            : "Start a streak — read at least one chapter today!"}
        </p>
      </div>
    </div>
  );
}
