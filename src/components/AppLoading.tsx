"use client";

export function AppLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <span className="text-5xl animate-float">📜</span>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
      <p className="text-sm text-muted">Loading Len Bible…</p>
    </div>
  );
}
