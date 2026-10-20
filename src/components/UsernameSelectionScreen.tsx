"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProgressStore } from "@/store/useProgressStore";
import { Sparkles } from "lucide-react";

const AVATARS = ["📖", "✝️", "🕊️", "🌟", "🔥", "💎", "🙏", "⚡"];

export function UsernameSelectionScreen() {
  const createProfile = useProgressStore((s) => s.createProfile);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: available } = await supabase.rpc("is_username_available", {
      p_username: trimmed,
    });

    if (!available) {
      setError("That username is taken — try another");
      setLoading(false);
      return;
    }

    const err = await createProfile(trimmed, avatar);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card glow-primary w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 text-center">
          <p className="mb-1 text-xs font-medium text-primary">Step 2 of 2 · Profile</p>
          <h1 className="mb-2 text-3xl font-bold text-primary">Pick a username</h1>
          <p className="text-muted">This is how you&apos;ll appear on the leaderboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Avatar</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`rounded-xl px-3 py-2 text-2xl ${
                    avatar === a ? "bg-primary/20 ring-1 ring-primary" : "bg-card hover:bg-card-hover"
                  }`}
                  aria-pressed={avatar === a}
                  aria-label={`Choose avatar ${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
              Username
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
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-background disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" />
            {loading ? "Creating…" : "Start reading"}
          </button>
        </form>
      </div>
    </div>
  );
}
