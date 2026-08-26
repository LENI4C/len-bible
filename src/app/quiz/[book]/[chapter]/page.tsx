"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchQuiz, ChapterQuiz, PASS_THRESHOLD } from "@/lib/bible-api";
import { getBook } from "@/lib/books";
import { useProgressStore } from "@/store/useProgressStore";
import { getNextChapter } from "@/lib/chronological-order";
import { AppLoading } from "@/components/AppLoading";
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
  const { version, saveQuizResult } = useProgressStore();

  const [quiz, setQuiz] = useState<ChapterQuiz | null>(null);
  const [loading, setLoading] = useState(true);
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
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchQuiz(version, bookId, chapter)
      .then((q) => {
        setQuiz(q);
        setAnswers(new Array(q.questions.length).fill(null));
        setCurrentQ(0);
        setSelected(null);
        setShowResult(false);
        setFinalScore(null);
      })
      .catch((e) => setError(e.message ?? "Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [version, bookId, chapter]);

  if (!bookData) return null;
  if (loading) return <AppLoading />;

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
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

  const finishQuiz = (finalAnswers: (number | null)[]) => {
    let score = 0;
    const failed: number[] = [];
    quiz.questions.forEach((q, i) => {
      if (finalAnswers[i] === q.correctIndex) score++;
      else failed.push(i);
    });
    const passed = score / quiz.questions.length >= PASS_THRESHOLD;
    const points = saveQuizResult(bookId, chapter, score, quiz.questions.length, failed);
    setShowResult(true);
    setFinalScore({ score, total: quiz.questions.length, passed, failed, points });
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    if (isLast) finishQuiz(newAnswers);
    else {
      setCurrentQ(currentQ + 1);
      setSelected(newAnswers[currentQ + 1]);
    }
  };

  if (showResult && finalScore) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-8 text-center">
          {finalScore.passed ? (
            <>
              <Trophy className="mx-auto mb-4 h-16 w-16 text-primary" />
              <h1 className="mb-2 text-3xl font-bold gradient-text">Quiz Passed!</h1>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-4 h-16 w-16 text-danger" />
              <h1 className="mb-2 text-3xl font-bold">Keep Learning</h1>
            </>
          )}
          <p className="mb-1 text-4xl font-bold">{finalScore.score}/{finalScore.total}</p>
          <p className="mb-4 text-muted">
            {Math.round((finalScore.score / finalScore.total) * 100)}% correct
            {finalScore.points > 0 && ` · +${finalScore.points} points`}
          </p>
          {!finalScore.passed && (
            <Link href={`/review/${bookId}/${chapter}`} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2 text-danger">
              <RotateCcw className="h-4 w-4" />
              Review missed questions
            </Link>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/read/${bookId}/${chapter}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3">
              <BookOpen className="h-4 w-4" />
              Re-read Chapter
            </Link>
            {next && (
              <Link href={`/read/${next.bookId}/${next.chapter}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background">
                Next Chapter
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/read/${bookId}/${chapter}`} className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to {bookData.name} {chapter}
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm text-muted">
          <span>{bookData.name} · Chapter {chapter} Quiz</span>
          <span>{currentQ + 1} of {quiz.questions.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Generated from the chapter text you read</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} className="glass-card rounded-2xl p-6">
          <h2 className="mb-6 text-lg font-semibold leading-relaxed">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${
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
          <button onClick={handleNext} disabled={selected === null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-background disabled:opacity-40">
            {isLast ? (<><CheckCircle2 className="h-5 w-5" />Submit Quiz</>) : "Next Question"}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
