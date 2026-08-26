"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useProgressStore } from "@/store/useProgressStore";
import { fetchChapter, BibleChapter } from "@/lib/bible-api";
import { getBook, BibleBook } from "@/lib/books";
import { getNextChapter, getPrevChapter } from "@/lib/chronological-order";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { useChapterCompletion } from "@/hooks/useChapterCompletion";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  CheckCircle2,
  Settings2,
  Volume2,
} from "lucide-react";

const SKELETON_WIDTHS = ["85%", "92%", "78%", "88%", "95%", "80%", "90%", "86%"];

export default function ReadPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter: chapterStr } = use(params);
  const bookId = book.toUpperCase();
  const chapter = parseInt(chapterStr, 10);
  const bookData = getBook(bookId);
  const { version } = useProgressStore();

  if (!bookData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">Book not found.</p>
        <Link href="/journey" className="mt-4 text-primary hover:underline">
          Back to Journey
        </Link>
      </div>
    );
  }

  return (
    <ReadChapter
      key={`${version}-${bookId}-${chapter}`}
      bookId={bookId}
      chapter={chapter}
      bookData={bookData}
      version={version}
    />
  );
}

function ReadChapter({
  bookId,
  chapter,
  bookData,
  version,
}: {
  bookId: string;
  chapter: number;
  bookData: BibleBook;
  version: string;
}) {
  const { setVersion, markChapterRead, readChapters, quizResults } = useProgressStore();
  const [data, setData] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const chapterKey = `${bookId}:${chapter}`;
  const alreadyRead = !!readChapters[chapterKey];
  const quizDone = quizResults[chapterKey];

  useEffect(() => {
    let cancelled = false;
    fetchChapter(version, bookId, chapter)
      .then((chapterData) => {
        if (!cancelled) setData(chapterData);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Could not load chapter.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version, bookId, chapter, retryCount]);

  const handleAutoComplete = useCallback(() => {
    if (alreadyRead) return;
    const earned = markChapterRead(bookId, chapter);
    setPointsEarned(earned);
  }, [alreadyRead, markChapterRead, bookId, chapter]);

  const completion = useChapterCompletion({
    verses: data?.verses ?? [],
    alreadyComplete: alreadyRead,
    onComplete: handleAutoComplete,
  });

  const next = getNextChapter(bookId, chapter);
  const prev = getPrevChapter(bookId, chapter);

  return (
    <>
      {!loading && data && !alreadyRead && !completion.isComplete && (
        <ReadingProgressBar {...completion} />
      )}

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/journey" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Journey
          </Link>
          <button
            onClick={() => setShowVersionPicker(!showVersionPicker)}
            className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm hover:bg-card-hover"
          >
            <Settings2 className="h-4 w-4" />
            {version}
          </button>
        </div>

        {showVersionPicker && (
          <div className="mb-4 rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-muted">Bible Version</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BIBLE_VERSIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVersion(v.id);
                    setShowVersionPicker(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    version === v.id ? "bg-primary text-background" : "bg-card-hover hover:bg-border"
                  }`}
                >
                  {v.abbreviation}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{bookData.name}</h1>
          <p className="text-muted">Chapter {chapter} · {version}</p>
          {data?.sourceTranslation && (
            <p className="mt-1 text-xs text-muted">Text: {data.sourceTranslation}</p>
          )}
        </div>

        <div className="glass-card mb-6 rounded-2xl p-6 sm:p-8">
          {loading && (
            <div className="space-y-4">
              {SKELETON_WIDTHS.map((width, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-border" style={{ width }} />
              ))}
            </div>
          )}
          {error && (
            <div className="text-center">
              <p className="text-danger">{error}</p>
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  setRetryCount((c) => c + 1);
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {data && (
            <>
              {data.audioUrl && (
                <div className="mb-6 rounded-xl bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                    <Volume2 className="h-4 w-4" />
                    Audio narration
                  </div>
                  <audio controls className="w-full" src={data.audioUrl} />
                </div>
              )}
              <div className="prose-bible">
                {data.verses.map((v) => (
                  <p key={v.verse} id={`verse-${v.verse}`}>
                    <sup className="verse-num">{v.verse}</sup>
                    {v.text}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          {(alreadyRead || completion.isComplete) && (
            <div className="rounded-xl bg-success/10 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-success" />
              <p className="font-medium text-success">
                Well read!{pointsEarned > 0 && ` +${pointsEarned} points`} — now see what you understood.
              </p>
            </div>
          )}

          {!alreadyRead && !completion.isComplete && data && (
            <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted">
              Read through the chapter at your own pace — scroll to the end to continue.
            </div>
          )}

          {(alreadyRead || completion.isComplete) && !quizDone && (
            <Link
              href={`/quiz/${bookId}/${chapter}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accent-light"
            >
              <Brain className="h-5 w-5" />
              Check Your Understanding (+25 pts)
            </Link>
          )}

          {quizDone && (
            <div className="rounded-xl bg-card p-4 text-center text-sm">
              Quiz: {quizDone.passed ? "✅ Passed" : "❌ Failed"} — {quizDone.score}/{quizDone.total}
              {!quizDone.passed && (
                <Link href={`/review/${bookId}/${chapter}`} className="ml-2 text-primary hover:underline">
                  Review mistakes
                </Link>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {prev ? (
              <Link href={`/read/${prev.bookId}/${prev.chapter}`} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm hover:bg-card">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {next ? (
              <Link href={`/read/${next.bookId}/${next.chapter}`} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm hover:bg-card">
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
