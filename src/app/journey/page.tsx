"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getChronologicalItems } from "@/lib/chronological-order";
import { getBookSummary } from "@/lib/book-summaries";
import { useProgressStore } from "@/store/useProgressStore";
import { chapterKey } from "@/lib/books";
import { BookSummaryModal } from "@/components/BookSummaryModal";
import { CheckCircle2, Lock, ChevronRight } from "lucide-react";

export default function JourneyPage() {
  const router = useRouter();
  const { readChapters, quizResults, bookSummariesSeen, markSummarySeen } = useProgressStore();
  const items = getChronologicalItems();
  const [selectedBook, setSelectedBook] = useState<{ bookId: string; order: number } | null>(null);

  const getBookProgress = (bookId: string, chapters: number) => {
    let read = 0;
    let passed = 0;
    for (let ch = 1; ch <= chapters; ch++) {
      const key = chapterKey(bookId, ch);
      if (readChapters[key]) read++;
      if (quizResults[key]?.passed) passed++;
    }
    return { read, passed, total: chapters };
  };

  const isBookUnlocked = (index: number) => {
    if (index === 0) return true;
    const prev = items[index - 1];
    const prevProgress = getBookProgress(prev.bookId, prev.chapters);
    // Prefer quiz mastery; fall back to read progress if quizzes sparse historically
    const mastered = Math.max(prevProgress.passed, Math.floor(prevProgress.read * 0.5));
    return mastered >= Math.ceil(prev.chapters * 0.5);
  };

  const handleBookClick = (bookId: string, order: number, unlocked: boolean) => {
    if (!unlocked) return;
    const summary = getBookSummary(bookId);
    if (summary && !bookSummariesSeen[bookId]) {
      setSelectedBook({ bookId, order });
    } else {
      router.push(`/read/${bookId}/1`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          Chronological <span className="text-primary">reading journey</span>
        </h1>
        <p className="text-muted">
          66 books ordered by the events they describe. Unlock the next book by passing quizzes on ~50% of the previous book.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const unlocked = isBookUnlocked(index);
          const progress = getBookProgress(item.bookId, item.chapters);
          const pct = Math.round((progress.read / item.chapters) * 100);
          const complete = progress.read === item.chapters;

          return (
            <div
              key={item.bookId}
              className={`glass-card rounded-xl ${unlocked ? "cursor-pointer hover:bg-card-hover" : "opacity-50"}`}
              onClick={() => handleBookClick(item.bookId, item.order, unlocked)}
              title={unlocked ? undefined : "Pass quizzes on about half of the previous book to unlock"}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${complete ? "bg-success/20 text-success" : unlocked ? "bg-primary/20 text-primary" : "bg-border text-muted"}`}>
                  {complete ? <CheckCircle2 className="h-5 w-5" /> : unlocked ? item.order : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.bookName}</h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted">{item.testament}</span>
                  </div>
                  <p className="text-sm text-muted">{item.chapters} chapters · {progress.read} read · {progress.passed} quizzes passed</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className={`h-full rounded-full ${complete ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {unlocked && (
                  <Link href={`/read/${item.bookId}/1`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-lg p-2 text-muted hover:text-primary">
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedBook && (
        <BookSummaryModal
          summary={getBookSummary(selectedBook.bookId)!}
          bookName={items.find((i) => i.bookId === selectedBook.bookId)!.bookName}
          orderNumber={selectedBook.order}
          onClose={() => setSelectedBook(null)}
          onStartReading={() => {
            markSummarySeen(selectedBook.bookId);
            setSelectedBook(null);
            router.push(`/read/${selectedBook.bookId}/1`);
          }}
        />
      )}
    </div>
  );
}
