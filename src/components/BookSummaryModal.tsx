"use client";

import { BookSummary } from "@/lib/book-summaries";
import { X, BookOpen, Calendar, MapPin, Target, Sparkles } from "lucide-react";

interface BookSummaryModalProps {
  summary: BookSummary;
  bookName: string;
  orderNumber: number;
  onClose: () => void;
  onStartReading: () => void;
}

export function BookSummaryModal({
  summary,
  bookName,
  orderNumber,
  onClose,
  onStartReading,
}: BookSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="glass-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium text-primary">Book {orderNumber} in Chronological Order</p>
            <h2 className="text-xl font-bold">{bookName}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card-hover hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold gradient-text">{summary.title}</h3>
            <p className="leading-relaxed text-muted">{summary.overview}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-card p-4">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted">Author</p>
                <p className="text-sm font-medium">{summary.author}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-card p-4">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted">Date Written</p>
                <p className="text-sm font-medium">{summary.dateWritten}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-card p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted">Setting</p>
                <p className="text-sm font-medium">{summary.setting}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-card p-4">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted">Purpose</p>
                <p className="text-sm font-medium">{summary.purpose}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Key Themes
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.keyThemes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">Key Verses</h4>
            <div className="space-y-1">
              {summary.keyVerses.map((verse) => (
                <p key={verse} className="text-sm text-muted">
                  • {verse}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
          <button
            onClick={onStartReading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-background transition-all hover:bg-primary-light"
          >
            Start Reading Chapter 1
          </button>
        </div>
      </div>
    </div>
  );
}
