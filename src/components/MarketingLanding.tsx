"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { BookOpen, Brain, Flame, Map } from "lucide-react";

export function MarketingLanding() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,168,83,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(107,76,154,0.2), transparent)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <section className="space-y-6">
          <h1 className="text-balance text-4xl font-bold leading-tight text-primary sm:text-5xl">
            Len Bible
          </h1>
          <p className="text-balance text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
            Read Scripture in the order it happened. Understand it. Keep going.
          </p>
          <p className="max-w-md text-pretty text-muted">
            Chronological reading with short comprehension checks and streaks — built for daily habit, not skimming.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Map, label: "Event-order journey across 66 books" },
              { icon: Brain, label: "Quizzes that check understanding" },
              { icon: Flame, label: "Streaks that reward finishing well" },
              { icon: BookOpen, label: "Real Bible text, synced progress" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2 text-sm text-foreground/90">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>
        <div className="rounded-2xl border border-border bg-card/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur">
          <AuthScreen compact />
        </div>
      </div>
    </div>
  );
}
