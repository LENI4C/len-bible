"use client";

import { useProgressStore } from "@/store/useProgressStore";
import { useStoreReady } from "@/hooks/useStoreReady";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { Navbar } from "@/components/Navbar";
import { AppLoading } from "@/components/AppLoading";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const ready = useStoreReady();
  const profile = useProgressStore((s) => s.profile);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppLoading />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <OnboardingScreen />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
