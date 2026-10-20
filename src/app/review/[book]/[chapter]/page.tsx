"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getBook } from "@/lib/books";
import { createClient } from "@/lib/supabase/client";
import { AppLoading } from "@/components/AppLoading";
import { ChevronLeft, XCircle, CheckCircle2, BookOpen, Brain, Lightbulb } from "lucide-react";

interface ReviewQuestion {
  question_id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  review_verse: string;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter: chapterStr } = use(params);
  const bookId = book.toUpperCase();
  const chapter = parseInt(chapterStr, 10);
  const bookData = getBook(bookId);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("get_quiz_review", {
        p_book_id: bookId,
        p_chapter: chapter,
      });
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message.includes("quiz_not_attempted")
          ? "Take the quiz first to unlock review."
          : rpcError.message);
        setLoading(false);
        return;
      }
      setQuestions((data?.questions as ReviewQuestion[]) ?? []);
      setFailedIds((data?.failed_question_ids as number[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter]);

  if (!bookData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">Book not found.</p>
        <Link href="/journey" className="mt-4 text-primary hover:underline">
          Back to Journey
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        <AppLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
        <p className="text-danger">{error}</p>
        <Link href={`/quiz/${bookId}/${chapter}`} className="mt-4 text-primary hover:underline">
          Back to quiz
        </Link>
      </div>
    );
  }

  const failedQuestions = questions.filter((q) => failedIds.includes(q.question_id));

  if (failedQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" />
        <p className="text-lg font-semibold">No missed questions to review</p>
        <Link href={`/quiz/${bookId}/${chapter}`} className="mt-4 text-primary hover:underline">
          Back to quiz
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/quiz/${bookId}/${chapter}`}
        className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to quiz
      </Link>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">
          Review: {bookData.name} chapter {chapter}
        </h1>
        <p className="text-muted">Correct answers are highlighted so you can learn from misses.</p>
      </div>
      <div className="space-y-6">
        {failedQuestions.map((q) => (
          <div key={q.question_id} className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
              <h3 className="font-semibold leading-relaxed">{q.question}</h3>
            </div>
            <div className="mb-4 space-y-2">
              {q.options.map((option, i) => {
                const correct = i === q.correct_index;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
                      correct
                        ? "border border-success/40 bg-success/10 text-foreground"
                        : "bg-card text-muted"
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                    {correct && (
                      <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" aria-label="Correct" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
                <Lightbulb className="h-4 w-4" />
                Explanation
              </div>
              <p className="text-sm text-muted">{q.explanation}</p>
              {q.review_verse && (
                <p className="mt-2 text-sm font-medium text-primary">{q.review_verse}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/read/${bookId}/${chapter}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3"
        >
          <BookOpen className="h-4 w-4" />
          Re-read chapter
        </Link>
        <Link
          href={`/quiz/${bookId}/${chapter}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"
        >
          <Brain className="h-4 w-4" />
          Retake quiz
        </Link>
      </div>
    </div>
  );
}
