"use client";

import { useEffect, useRef, useState } from "react";
import {
  minReadTimeMs,
  countWords,
  scrollThresholdPercent,
  BibleVerse,
} from "@/lib/quiz-generator";

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
  encouragement: string;
}

const ENCOURAGEMENTS = [
  "Take your time — let the words sink in.",
  "You're making progress!",
  "Almost there — reflect on what you've read.",
  "Great pace. Keep going!",
];

export function useChapterCompletion({
  verses,
  alreadyComplete,
  onComplete,
}: UseChapterCompletionOptions): CompletionState {
  const [scrollProgress, setScrollProgress] = useState(alreadyComplete ? 100 : 0);
  const [timeProgress, setTimeProgress] = useState(alreadyComplete ? 100 : 0);
  const [isCompleteLocal, setIsCompleteLocal] = useState(false);
  const [encouragement, setEncouragement] = useState(ENCOURAGEMENTS[0]);
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    verses.length > 0 && !alreadyComplete ? Math.ceil(minReadTimeMs(verses) / 1000) : 0
  );
  const startTime = useRef<number | null>(null);
  const maxScroll = useRef(0);
  const completedRef = useRef(alreadyComplete);
  const onCompleteRef = useRef(onComplete);

  const isComplete = alreadyComplete || isCompleteLocal;
  const wordsTotal = countWords(verses);
  const minTime = minReadTimeMs(verses);
  const scrollThreshold = scrollThresholdPercent();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (alreadyComplete) {
      completedRef.current = true;
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

      if (pct > 50 && pct < scrollThreshold) {
        setEncouragement("Almost finished — read through to the end!");
      } else if (pct >= scrollThreshold) {
        setEncouragement("Nice! Just a moment more to reflect on what you read.");
      }
    };

    const tick = () => {
      if (!startTime.current || completedRef.current) return;
      const elapsed = Date.now() - startTime.current;
      const timePct = Math.min(100, (elapsed / minTime) * 100);
      setTimeProgress(Math.round(timePct));
      setSecondsRemaining(Math.max(0, Math.ceil((minTime - elapsed) / 1000)));

      const scrollMet = maxScroll.current >= scrollThreshold;
      const timeMet = elapsed >= minTime;

      if (scrollMet && timeMet && !completedRef.current) {
        completedRef.current = true;
        setIsCompleteLocal(true);
        setScrollProgress(100);
        setTimeProgress(100);
        setSecondsRemaining(0);
        setEncouragement("Ready! See how much you understood.");
        onCompleteRef.current();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    const interval = setInterval(tick, 400);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [verses, minTime, scrollThreshold, alreadyComplete]);

  const readProgress = isComplete
    ? 100
    : Math.round(
        Math.min(scrollProgress / scrollThreshold, 1) * 65 +
          Math.min(timeProgress / 100, 1) * 35
      );

  return {
    scrollProgress,
    timeProgress,
    readProgress,
    isComplete,
    wordsTotal,
    secondsRemaining,
    encouragement,
  };
}
