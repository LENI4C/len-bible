"use client";

interface ReadingProgressProps {
  scrollProgress: number;
  readProgress: number;
  isComplete: boolean;
  secondsRemaining: number;
  encouragement: string;
}

export function ReadingProgressBar({
  readProgress,
  isComplete,
  secondsRemaining,
  encouragement,
}: ReadingProgressProps) {
  if (isComplete) {
    return (
      <div className="sticky top-[57px] z-40 border-b border-success/20 bg-success/10 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <span className="text-sm font-medium text-success">✓ Ready — check what you understood from this chapter</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-[57px] z-40 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">{encouragement}</span>
          <span className="font-medium text-primary">{readProgress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${readProgress}%` }}
          />
        </div>
        {secondsRemaining > 0 && readProgress > 40 && (
          <p className="mt-1 text-[11px] text-muted">
            {secondsRemaining <= 5
              ? "Finishing up..."
              : `~${secondsRemaining}s to reflect on this passage`}
          </p>
        )}
      </div>
    </div>
  );
}
