import { NextRequest, NextResponse } from "next/server";
import { BIBLE_BOOKS } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";
import { ensureQuizQuestions } from "@/lib/ensure-quiz";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ version: string; book: string; chapter: string }> }
) {
  const { book, chapter: chapterStr } = await params;
  const chapterNum = parseInt(chapterStr, 10);
  const bookData = BIBLE_BOOKS[book.toUpperCase()];

  if (!bookData || isNaN(chapterNum)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to take quizzes" }, { status: 401 });
  }

  // Prefer RLS-scoped client view; ensure rows exist first
  try {
    await ensureQuizQuestions(bookData.id, chapterNum);
  } catch (e) {
    console.error("Quiz ensure error:", e);
  }

  const { data: rows, error } = await supabase
    .from("quiz_questions_client")
    .select("question_id, question, options")
    .eq("book_id", bookData.id)
    .eq("chapter", chapterNum)
    .order("question_id");

  if (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json(
      { error: "Quiz not available for this chapter yet." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      bookId: bookData.id,
      bookName: bookData.name,
      chapter: chapterNum,
      questions: rows.map((row) => ({
        id: row.question_id,
        question: row.question,
        options: row.options as string[],
      })),
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
