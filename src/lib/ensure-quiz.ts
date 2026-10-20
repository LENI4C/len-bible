import { createServiceClient } from "@/lib/supabase/admin";
import { fetchBibleChapter } from "@/lib/bible-server";
import { generateQuizFromVerses } from "@/lib/quiz-generator";
import { BIBLE_BOOKS } from "@/lib/books";

/** Ensure 4 quiz rows exist for a chapter; generate+upsert from verses if missing. */
export async function ensureQuizQuestions(bookId: string, chapter: number): Promise<boolean> {
  const admin = createServiceClient();
  const { count } = await admin
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("chapter", chapter);

  if ((count ?? 0) >= 4) return true;

  const bookData = BIBLE_BOOKS[bookId];
  if (!bookData) return false;

  const fetched = await fetchBibleChapter("NIV", bookId, chapter);
  const quiz = generateQuizFromVerses(bookId, bookData.name, chapter, fetched.verses);

  const rows = quiz.questions.map((q) => ({
    book_id: bookId,
    chapter,
    question_id: q.id,
    question: q.question,
    options: q.options,
    correct_index: q.correctIndex,
    explanation: q.explanation,
    review_verse: q.reviewVerse ?? `${bookData.name} ${chapter}:1`,
  }));

  const { error } = await admin.from("quiz_questions").upsert(rows);
  if (error) {
    console.error("ensureQuizQuestions upsert failed:", error);
    return false;
  }
  return true;
}
