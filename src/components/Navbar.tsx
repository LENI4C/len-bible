"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Trophy, Flame, Star, Home } from "lucide-react";
import { useProgressStore } from "@/store/useProgressStore";
import { getLevel } from "@/lib/points";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/journey", label: "Journey", icon: BookOpen },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const profile = useProgressStore((s) => s.profile);
  const points = useProgressStore((s) => s.points);
  const streak = useProgressStore((s) => s.streak);

  if (!profile) return null;

  const level = getLevel(points);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl transition-transform duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            📜
          </span>
          <span className="text-lg font-bold gradient-text">Len Bible</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm sm:flex" title="Streak">
            <Flame className="h-4 w-4 text-warning" aria-hidden />
            <span className="font-semibold tabular-nums">{streak}</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm sm:flex" title="Points">
            <Star className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-semibold tabular-nums">{points.toLocaleString()}</span>
          </div>
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 transition-colors hover:bg-card-hover"
          >
            <span className="text-lg" aria-hidden>
              {profile.avatar}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none">{profile.username}</p>
              <p className="text-[10px] text-muted">
                Lv.{level.level} {level.title}
              </p>
            </div>
          </Link>
        </div>
      </div>

      <nav className="flex border-t border-border sm:hidden" aria-label="Mobile">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
            pathname === "/profile" ? "text-primary" : "text-muted"
          }`}
        >
          <span className="text-lg" aria-hidden>
            {profile.avatar}
          </span>
          Profile
        </Link>
      </nav>
    </header>
  );
}
