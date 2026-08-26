"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { minReadTimeMs, countWords, BibleVerse } from "@/lib/quiz-generator";

interface UseChapterCompletionOptions {
  verses: BibleVerse[];
  alreadyComplete: boolean;
  onComplete: () => void;
}

interface CompletionState {
  scrollProgress: number;
  timeProgress: number;
  readProgress: number;
  isComplete: boolean;
  wordsTotal: number;
  secondsRemaining: number;
}

export function useChapterCompletion({
  verses,
  alreadyComplete,
  onComplete,
}: UseChapterCompletionOptions): CompletionState {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timeProgress, setTimeProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(alreadyComplete);
  const startTime = useRef<number | null>(null);
  const maxScroll = useRef(0);
  const completedRef = useRef(alreadyComplete);
  const onCompleteRef = useRef(onComplete);

  const wordsTotal = countWords(verses);
  const minTime = minReadTimeMs(verses);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (alreadyComplete) {
      setIsComplete(true);
      completedRef.current = true;
      setScrollProgress(100);
      setTimeProgress(100);
    }
  }, [alreadyComplete]);

  useEffect(() => {
    if (verses.length === 0 || alreadyComplete) return;

    startTime.current = Date.now();
    maxScroll.current = 0;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 100;
      maxScroll.current = Math.max(maxScroll.current, pct);
      setScrollProgress(Math.round(maxScroll.current));
    };

    const tick = () => {
      if (!startTime.current || completedRef.current) return;
      const elapsed = Date.now() - startTime.current;
      const timePct = Math.min(100, (elapsed / minTime) * 100);
      setTimeProgress(Math.round(timePct));

      const scrollMet = maxScroll.current >= 88;
      const timeMet = elapsed >= minTime;

      if (scrollMet && timeMet && !completedRef.current) {
        completedRef.current = true;
        setIsComplete(true);
        setScrollProgress(100);
        setTimeProgress(100);
        onCompleteRef.current();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    const interval = setInterval(tick, 500);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [verses, minTime, alreadyComplete]);

  const elapsed = startTime.current ? Date.now() - startTime.current : 0;
  const secondsRemaining = Math.max(0, Math.ceil((minTime - elapsed) / 1000));

  const readProgress = isComplete
    ? 100
    : Math.round(
        (Math.min(scrollProgress / 88, 1) * 0.55 + Math.min(timeProgress / 100, 1) * 0.45) *
          100
      );

  return {
    scrollProgress,
    timeProgress,
    readProgress,
    isComplete,
    wordsTotal,
    secondsRemaining,
  };
}

export function useScrollToVerse() {
  return useCallback((verseNum: number) => {
    const el = document.getElementById(`verse-${verseNum}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
}
