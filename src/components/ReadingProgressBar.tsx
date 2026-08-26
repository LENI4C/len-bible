"use client";

interface ReadingProgressProps {
  scrollProgress: number;
  timeProgress: number;
  readProgress: number;
  isComplete: boolean;
  wordsTotal: number;
  secondsRemaining: number;
}

export function ReadingProgressBar({
  scrollProgress,
  timeProgress,
  readProgress,
  isComplete,
  wordsTotal,
  secondsRemaining,
}: ReadingProgressProps) {
  if (isComplete) {
    return (
      <div className="sticky top-[57px] z-40 border-b border-success/20 bg-success/10 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-sm font-medium text-success">✓ Chapter completed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-[57px] z-40 border-b border-border bg-background/90 px-4 py-2 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>Reading progress</span>
          <span>{readProgress}%</span>
        </div>
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${readProgress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
          <span>Scroll: {Math.min(scrollProgress, 100)}% / 88% needed</span>
          <span>Time: {timeProgress}% ({secondsRemaining}s left)</span>
          <span>{wordsTotal.toLocaleString()} words</span>
        </div>
      </div>
    </div>
  );
}
