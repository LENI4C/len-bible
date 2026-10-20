"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fetchQuiz, ChapterQuiz } from "@/lib/bible-api";
import { getBook, BibleBook } from "@/lib/books";
import { useProgressStore } from "@/store/useProgressStore";
import { getNextChapter } from "@/lib/chronological-order";
import { AppLoading } from "@/components/AppLoading";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  BookOpen,
} from "lucide-react";

export default function QuizPage({
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">Book not found.</p>
        <Link href="/journey" className="mt-4 text-primary hover:underline">
          Back to Journey
        </Link>
      </div>
    );
  }

  return (
    <QuizSession
      key={`${version}-${bookId}-${chapter}`}
      bookId={bookId}
      chapter={chapter}
      bookData={bookData}
      version={version}
    />
  );
}

function QuizSession({
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
  const saveQuizResult = useProgressStore((s) => s.saveQuizResult);
  const reduceMotion = useReducedMotion();
  const [quiz, setQuiz] = useState<ChapterQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finalScore, setFinalScore] = useState<{
    score: number;
    total: number;
    passed: boolean;
    failed: number[];
    points: number;
    streakBonus: number;
    selected: (number | null)[];
    review: {
      question_id: number;
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuiz(version, bookId, chapter)
      .then((q) => {
        if (cancelled) return;
        setQuiz(q);
        setAnswers(new Array(q.questions.length).fill(null));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load quiz");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version, bookId, chapter]);

  const finishQuiz = useCallback(
    async (finalAnswers: (number | null)[]) => {
      if (!quiz) return;
      setSubmitting(true);
      try {
        const payload = quiz.questions.map((q, i) => ({
          question_id: q.id,
          selected_index: finalAnswers[i] ?? -1,
        }));
        const result = await saveQuizResult(bookId, chapter, payload);
        setShowResult(true);
        setFinalScore({
          score: result.score,
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          points: result.points,
          streakBonus: result.streakBonus,
          selected: finalAnswers,
          review: result.review ?? [],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit quiz");
      } finally {
        setSubmitting(false);
      }
    },
    [quiz, saveQuizResult, bookId, chapter]
  );

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        <AppLoading />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
        <p className="text-danger">{error || "Quiz unavailable"}</p>
        <Link href={`/read/${bookId}/${chapter}`} className="mt-4 text-primary hover:underline">
          Back to chapter
        </Link>
      </div>
    );
  }

  const question = quiz.questions[currentQ];
  const isLast = currentQ === quiz.questions.length - 1;
  const next = getNextChapter(bookId, chapter);

  const handleNext = () => {
    if (selected === null || submitting) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    if (isLast) void finishQuiz(newAnswers);
    else {
      setCurrentQ(currentQ + 1);
      setSelected(newAnswers[currentQ + 1]);
    }
  };

  if (showResult && finalScore) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ConfettiBurst active={finalScore.passed} />
        <motion.div
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-2xl p-8 text-center"
          role="status"
          aria-live="polite"
        >
          {finalScore.passed ? (
            <>
              <Trophy className="mx-auto mb-4 h-16 w-16 text-primary" aria-hidden />
              <h1 className="mb-2 text-3xl font-bold text-primary">You understood it</h1>
              <p className="mb-4 text-muted">
                Streak updated. Great grasp of the key ideas from this chapter.
              </p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-4 h-16 w-16 text-danger" aria-hidden />
              <h1 className="mb-2 text-3xl font-bold">Worth another look</h1>
              <p className="mb-4 text-muted">No shame in re-reading — understanding beats speed.</p>
            </>
          )}
          <p className="mb-1 text-4xl font-bold tabular-nums">
            {finalScore.score}/{finalScore.total}
          </p>
          <p className="mb-4 text-muted">
            {Math.round((finalScore.score / finalScore.total) * 100)}% correct
            {finalScore.points > 0 && ` · +${finalScore.points} points`}
            {finalScore.streakBonus > 0 && ` (includes streak bonus)`}
          </p>

          {finalScore.review.length > 0 && (
            <div className="mb-6 space-y-3 text-left">
              <p className="text-sm font-medium text-muted">Question breakdown</p>
              {finalScore.review.map((q, i) => {
                const picked = finalScore.selected[i] ?? -1;
                const ok = picked === q.correct_index;
                return (
                  <div
                    key={q.question_id}
                    className={`rounded-xl border p-3 text-sm ${
                      ok ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                    }`}
                  >
                    <div className="mb-1 flex items-start gap-2">
                      {ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Correct" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Incorrect" />
                      )}
                      <span className="font-medium">{q.question}</span>
                    </div>
                    <p className="pl-6 text-muted">
                      {ok
                        ? `You chose: ${q.options[picked]}`
                        : `Correct: ${q.options[q.correct_index]}${
                            picked >= 0 ? ` · You chose: ${q.options[picked]}` : ""
                          }`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {finalScore.failed.length > 0 && (
            <Link
              href={`/review/${bookId}/${chapter}`}
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2 text-danger"
            >
              <RotateCcw className="h-4 w-4" />
              Study misses with explanations
            </Link>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/read/${bookId}/${chapter}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3"
            >
              <BookOpen className="h-4 w-4" />
              Re-read chapter
            </Link>
            {next && finalScore.passed && (
              <Link
                href={`/read/${next.bookId}/${next.chapter}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"
              >
                Next chapter
              </Link>
            )}
            {!finalScore.passed && (
              <Link
                href={`/quiz/${bookId}/${chapter}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background"
              >
                Try again
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/read/${bookId}/${chapter}`}
        className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {bookData.name} {chapter}
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm text-muted">
          <span>
            {bookData.name} · Chapter {chapter} · Understanding check
          </span>
          <span>
            {currentQ + 1} of {quiz.questions.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={currentQ + 1} aria-valuemin={1} aria-valuemax={quiz.questions.length}>
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Pass this quiz to secure today&apos;s streak. Answers are graded on the server.
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={reduceMotion ? false : { x: 16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { x: -16, opacity: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="mb-6 text-lg font-semibold leading-snug" id={`q-${currentQ}`}>
            {question.question}
          </h2>
          <div
            className="space-y-3"
            role="radiogroup"
            aria-labelledby={`q-${currentQ}`}
          >
            {question.options.map((option, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected === i}
                onClick={() => setSelected(i)}
                className={`quiz-option flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected === i ? "border-primary bg-primary/10" : "border-border hover:bg-card-hover"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-sm font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background disabled:opacity-40"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {submitting ? "Submitting…" : "Submit quiz"}
              </>
            ) : (
              "Next question"
            )}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
