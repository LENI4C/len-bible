export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  bookId: string;
  bookName: string;
  chapter: number;
  version: string;
  sourceTranslation?: string;
  textSource?: "api.bible" | "helloao.org";
  verses: BibleVerse[];
  audioUrl?: string | null;
}

export interface ChapterQuiz {
  bookId: string;
  bookName: string;
  chapter: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  explanation?: string;
  reviewVerse?: string;
  correctIndex?: number;
}

export { PASS_THRESHOLD } from "@/lib/points";

export async function fetchChapter(
  versionId: string,
  bookId: string,
  chapter: number
): Promise<BibleChapter> {
  const res = await fetch(`/api/bible/${versionId}/${bookId}/${chapter}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch chapter");
  }
  return res.json();
}

export async function fetchQuiz(
  versionId: string,
  bookId: string,
  chapter: number
): Promise<ChapterQuiz> {
  const res = await fetch(
    `/api/quiz/${versionId}/${bookId}/${chapter}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch quiz");
  }
  return res.json();
}
