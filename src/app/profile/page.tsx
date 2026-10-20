"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { getLevel } from "@/lib/points";
import { getTotalChapters } from "@/lib/chronological-order";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { ProgressRing } from "@/components/ProgressRing";
import { createClient } from "@/lib/supabase/client";
import { Flame, Star, BookOpen, Brain, Award, Settings2, Shield } from "lucide-react";

const AVATARS = ["📖", "✝️", "🕊️", "🌟", "🔥", "💎", "🙏", "⚡"];

interface BadgeRow {
  badge_id: string;
  earned_at: string;
  badges: { title: string; description: string; icon: string } | null;
}

export default function ProfilePage() {
  const {
    profile,
    points,
    streak,
    longestStreak,
    streakFreezes,
    version,
    setVersion,
    signOut,
    getChaptersReadCount,
    getQuizzesPassedCount,
    loadFromSupabase,
  } = useProgressStore();

  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const avatar = avatarDraft ?? profile?.avatar ?? "📖";

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    void (async () => {
      const { data: owned } = await supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("user_id", profile.id);
      if (!owned?.length) {
        setBadges([]);
        return;
      }
      const ids = owned.map((o) => o.badge_id);
      const { data: defs } = await supabase.from("badges").select("*").in("id", ids);
      const byId = new Map((defs ?? []).map((d) => [d.id, d]));
      setBadges(
        owned.map((o) => ({
          badge_id: o.badge_id,
          earned_at: o.earned_at,
          badges: byId.get(o.badge_id)
            ? {
                title: byId.get(o.badge_id)!.title as string,
                description: byId.get(o.badge_id)!.description as string,
                icon: byId.get(o.badge_id)!.icon as string,
              }
            : null,
        }))
      );
    })();
  }, [profile]);

  if (!profile) return null;

  const level = getLevel(points);
  const totalChapters = getTotalChapters();
  const chaptersRead = getChaptersReadCount();
  const quizzesPassed = getQuizzesPassedCount();
  const progressPct = Math.round((chaptersRead / totalChapters) * 100);
  const levelProgress =
    level.level >= 8
      ? 100
      : Math.round(((points - level.at) / (level.nextAt - level.at)) * 100);

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const saveAvatar = async (next: string) => {
    setAvatarDraft(next);
    setSavingAvatar(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ avatar: next }).eq("id", profile.id);
    await loadFromSupabase();
    setAvatarDraft(null);
    setSavingAvatar(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-block text-6xl" aria-hidden>
          {avatar}
        </span>
        <h1 className="text-2xl font-bold">{profile.username}</h1>
        <p className="text-muted">Member since {memberSince}</p>
      </div>

      <div className="glass-card mb-6 rounded-2xl p-4">
        <p className="mb-2 text-sm font-medium">Avatar</p>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={savingAvatar}
              onClick={() => void saveAvatar(a)}
              className={`rounded-xl px-3 py-2 text-2xl ${
                avatar === a ? "bg-primary/20 ring-1 ring-primary" : "bg-card hover:bg-card-hover"
              }`}
              aria-label={`Choose avatar ${a}`}
              aria-pressed={avatar === a}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card mb-6 flex items-center gap-6 rounded-2xl p-6">
        <ProgressRing progress={levelProgress} size={100} label={`Lv.${level.level}`} sublabel={level.title} />
        <div className="flex-1">
          <p className="mb-1 font-semibold">{level.title}</p>
          <p className="mb-2 text-sm text-muted">
            {points.toLocaleString()} / {level.nextAt.toLocaleString()} pts to next level
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(levelProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <MiniStat icon={<Flame className="h-4 w-4 text-warning" />} label="Streak" value={`${streak} days`} />
        <MiniStat icon={<Award className="h-4 w-4 text-primary" />} label="Best streak" value={`${longestStreak} days`} />
        <MiniStat icon={<Shield className="h-4 w-4 text-accent-light" />} label="Freezes" value={String(streakFreezes)} />
        <MiniStat icon={<BookOpen className="h-4 w-4 text-accent-light" />} label="Chapters" value={`${chaptersRead}/${totalChapters}`} />
        <MiniStat icon={<Brain className="h-4 w-4 text-success" />} label="Quizzes" value={quizzesPassed.toString()} />
        <MiniStat icon={<Star className="h-4 w-4 text-primary" />} label="Points" value={points.toLocaleString()} />
        <MiniStat icon={<BookOpen className="h-4 w-4 text-muted" />} label="Progress" value={`${progressPct}%`} colSpan />
      </div>

      {badges.length > 0 && (
        <div className="glass-card mb-6 rounded-2xl p-6">
          <h2 className="mb-3 font-semibold">Badges</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <li key={b.badge_id} className="rounded-xl bg-card p-3 text-sm">
                <span className="mr-2 text-lg" aria-hidden>
                  {b.badges?.icon ?? "🏅"}
                </span>
                <span className="font-medium">{b.badges?.title ?? b.badge_id}</span>
                <p className="mt-0.5 text-xs text-muted">{b.badges?.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Bible version</h2>
        </div>
        <div className="grid gap-2">
          {BIBLE_VERSIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVersion(v.id)}
              className={`flex items-center justify-between rounded-xl p-3 text-left ${
                version === v.id ? "border border-primary/30 bg-primary/15" : "bg-card hover:bg-card-hover"
              }`}
            >
              <div>
                <p className="font-medium">{v.abbreviation}</p>
                <p className="text-xs text-muted">Serves {v.fallbackName} when licensed text is unavailable</p>
              </div>
              {version === v.id && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-background">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {confirmSignOut ? (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmSignOut(false)}
            className="flex-1 rounded-xl border border-border py-3 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex-1 rounded-xl bg-danger/15 py-3 text-sm font-medium text-danger"
          >
            Confirm sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className="mt-6 w-full rounded-xl border border-border py-3 text-sm text-muted hover:bg-card hover:text-foreground"
        >
          Sign out
        </button>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  colSpan,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div className={`glass-card rounded-xl p-4 ${colSpan ? "col-span-2" : ""}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
