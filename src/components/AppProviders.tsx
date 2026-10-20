"use client";

import { useProgressStore } from "@/store/useProgressStore";
import { useStoreReady } from "@/hooks/useStoreReady";
import { UsernameSelectionScreen } from "@/components/UsernameSelectionScreen";
import { Navbar } from "@/components/Navbar";
import { AppLoading } from "@/components/AppLoading";
import { MarketingLanding } from "@/components/MarketingLanding";
import { LevelUpToast } from "@/components/LevelUpToast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const ready = useStoreReady();
  const authUser = useProgressStore((s) => s.authUser);
  const profile = useProgressStore((s) => s.profile);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <AppLoading />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <main id="main-content">
          <MarketingLanding />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <main id="main-content">
          <UsernameSelectionScreen />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <LevelUpToast />
    </div>
  );
}
