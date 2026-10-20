"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#0f0f1a] px-4 text-center text-[#f0ebe3]">
        <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
        <p className="mb-6 max-w-md text-sm text-[#9ca3af]">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#d4a853] px-6 py-3 font-semibold text-[#0f0f1a]"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
