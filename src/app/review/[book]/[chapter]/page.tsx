"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchQuiz, ChapterQuiz } from "@/lib/bible-api";
import { getBook } from "@/lib/books";
import { useProgressStore } from "@/store/useProgressStore";
import { chapterKey } from "@/lib/books";
import { AppLoading } from "@/components/AppLoading";
import { ChevronLeft, XCircle, CheckCircle2, BookOpen, Brain, Lightbulb } from "lucide-react";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter: chapterStr } = use(params);
  const bookId = book.toUpperCase();
  const chapter = parseInt(chapterStr, 10);
  const bookData = getBook(bookId);
  const { version, quizResults } = useProgressStore();
  const [quiz, setQuiz] = useState<ChapterQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuiz(version, bookId, chapter)
      .then(setQuiz)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [version, bookId, chapter]);

  if (!bookData) return null;
  if (loading) return <AppLoading />;

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-danger">{error || "Review unavailable"}</p>
        <Link href={`/quiz/${bookId}/${chapter}`} className="mt-4 text-primary hover:underline">Back to quiz</Link>
      </div>
    );
  }

  const result = quizResults[chapterKey(bookId, chapter)];
  const failedIndices = result?.failedQuestions ?? [];
  const failedQuestions = failedIndices.map((i) => quiz.questions[i]);

  if (failedQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" />
        <p className="text-lg font-semibold">No missed questions to review!</p>
        <Link href={`/quiz/${bookId}/${chapter}`} className="mt-4 text-primary hover:underline">Back to quiz</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/quiz/${bookId}/${chapter}`} className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to Quiz
      </Link>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">Review: {bookData.name} Chapter {chapter}</h1>
        <p className="text-muted">Study questions drawn from the chapter you read.</p>
      </div>
      <div className="space-y-6">
        {failedQuestions.map((q) => (
          <div key={q.id} className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <h3 className="font-semibold leading-relaxed">{q.question}</h3>
            </div>
            <div className="mb-4 space-y-2">
              {q.options.map((option, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${i === q.correctIndex ? "bg-success/10 text-success" : "bg-card text-muted"}`}>
                  {i === q.correctIndex ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">{String.fromCharCode(65 + i)}</span>}
                  {option}
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary"><Lightbulb className="h-4 w-4" />Explanation</div>
              <p className="text-sm text-muted">{q.explanation}</p>
              {q.reviewVerse && <p className="mt-2 text-sm font-medium text-primary">📖 {q.reviewVerse}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={`/read/${bookId}/${chapter}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3"><BookOpen className="h-4 w-4" />Re-read Chapter</Link>
        <Link href={`/quiz/${bookId}/${chapter}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"><Brain className="h-4 w-4" />Retake Quiz</Link>
      </div>
    </div>
  );
}
