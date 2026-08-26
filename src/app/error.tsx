"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 text-5xl">⚠️</span>
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="mb-6 max-w-md text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-background hover:bg-primary-light"
      >
        Try again
      </button>
    </div>
  );
}
