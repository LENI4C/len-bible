"use client";

import { useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { Sparkles } from "lucide-react";

export function OnboardingScreen() {
  const { setProfile } = useProgressStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    setProfile(trimmed);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card glow-primary w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 text-center">
          <span className="mb-4 inline-block text-5xl animate-float">📜</span>
          <h1 className="mb-2 text-3xl font-bold gradient-text">Welcome to Len Bible</h1>
          <p className="text-muted">
            Read the Bible in chronological order, earn points, build streaks, and
            climb the leaderboard!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
              Choose your username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="e.g. FaithWalker"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-background transition-all hover:bg-primary-light"
          >
            <Sparkles className="h-5 w-5" />
            Begin Your Journey
          </button>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted">
          <div className="rounded-lg bg-card p-2">
            <span className="block text-lg">📖</span>
            Read & Earn
          </div>
          <div className="rounded-lg bg-card p-2">
            <span className="block text-lg">🧠</span>
            Quiz & Review
          </div>
          <div className="rounded-lg bg-card p-2">
            <span className="block text-lg">🏆</span>
            Compete
          </div>
        </div>
      </div>
    </div>
  );
}
