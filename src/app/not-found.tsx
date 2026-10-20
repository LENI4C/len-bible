import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-sm font-medium text-primary">404</p>
      <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
      <p className="mb-6 max-w-md text-sm text-muted">
        That route isn&apos;t part of the journey. Head home or open the chronological reading path.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background">
          Home
        </Link>
        <Link href="/journey" className="rounded-xl border border-border px-5 py-2.5 text-sm">
          Journey
        </Link>
      </div>
    </div>
  );
}
