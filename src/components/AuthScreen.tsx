"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Mail } from "lucide-react";

export function AuthScreen({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className={`flex flex-1 items-center justify-center ${compact ? "px-2 py-4" : "px-4 py-12"}`}>
      <div className={`w-full max-w-md rounded-2xl ${compact ? "p-6" : "glass-card glow-primary p-8"}`}>
        <div className={`text-center ${compact ? "mb-4" : "mb-6"}`}>
          {!compact && (
            <span className="mb-4 inline-block text-5xl animate-float" aria-hidden>
              📜
            </span>
          )}
          <p className="mb-1 text-xs font-medium text-primary">Step 1 of 2 · Sign in</p>
          <h1 className={`mb-2 font-bold text-primary ${compact ? "text-2xl" : "text-3xl"}`}>
            {compact ? "Start your journey" : "Welcome to Len Bible"}
          </h1>
          <p className="text-sm text-muted">
            Magic link sign-in — no password. Progress syncs across devices.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-success/10 p-4 text-center" role="status">
            <Mail className="mx-auto mb-2 h-8 w-8 text-success" aria-hidden />
            <p className="font-medium text-success">Check your email</p>
            <p className="mt-1 text-sm text-muted">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
            <button
              type="button"
              className="mt-3 text-sm text-primary hover:underline"
              onClick={() => {
                setSent(false);
                setLoading(false);
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              {error && (
                <p className="mt-1 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-background transition-all hover:bg-primary-light disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" aria-hidden />
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        {!compact && (
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted">
            <div className="rounded-lg bg-card p-2">
              <BookOpenIcon />
              Read
            </div>
            <div className="rounded-lg bg-card p-2">
              <BrainIcon />
              Quiz
            </div>
            <div className="rounded-lg bg-card p-2">
              <TrophyIcon />
              Compete
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookOpenIcon() {
  return <span className="mb-1 block text-lg" aria-hidden>📖</span>;
}
function BrainIcon() {
  return <span className="mb-1 block text-lg" aria-hidden>🧠</span>;
}
function TrophyIcon() {
  return <span className="mb-1 block text-lg" aria-hidden>🏆</span>;
}
