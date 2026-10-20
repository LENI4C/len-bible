"use client";

import { useState } from "react";

export function ReportModal({
  open,
  onClose,
  onSubmit,
  title = "Report content",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  title?: string;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <h2 id="report-title" className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-3 text-sm text-muted">Tell us what’s wrong. Moderators will review it.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Reason (at least 3 characters)"
          autoFocus
        />
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (reason.trim().length < 3) {
                setError("Please enter at least 3 characters.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await onSubmit(reason.trim());
                setReason("");
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not submit report");
              } finally {
                setBusy(false);
              }
            }}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {busy ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
