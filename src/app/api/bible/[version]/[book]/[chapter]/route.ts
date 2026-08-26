import { NextRequest, NextResponse } from "next/server";
import { BIBLE_BOOKS } from "@/lib/books";
import { getVersion } from "@/lib/bible-versions";
import { fetchBibleChapter } from "@/lib/bible-server";

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
    return NextResponse.json(chapter);
  } catch (err) {
    console.error("Bible fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}
