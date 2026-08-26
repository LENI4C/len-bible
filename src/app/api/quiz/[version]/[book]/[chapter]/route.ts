import { NextRequest, NextResponse } from "next/server";
import { BIBLE_BOOKS } from "@/lib/books";
import { getVersion } from "@/lib/bible-versions";
import { fetchBibleChapter } from "@/lib/bible-server";
import { generateQuizFromVerses } from "@/lib/quiz-generator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ version: string; book: string; chapter: string }> }
) {
  const { version, book, chapter: chapterStr } = await params;
  const chapterNum = parseInt(chapterStr, 10);
  const bookData = BIBLE_BOOKS[book.toUpperCase()];
  const versionData = getVersion(version.toUpperCase());

  if (!bookData || !versionData || isNaN(chapterNum)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const chapter = await fetchBibleChapter(version.toUpperCase(), bookData.id, chapterNum);
    const quiz = generateQuizFromVerses(
      bookData.id,
      bookData.name,
      chapterNum,
      chapter.verses
    );

    if (quiz.questions.length === 0) {
      return NextResponse.json({ error: "Could not generate quiz for this chapter" }, { status: 500 });
    }

    return NextResponse.json(quiz);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
