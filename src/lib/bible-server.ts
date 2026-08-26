import { BIBLE_BOOKS, getHelloaoBookId } from "@/lib/books";
import { getVersion } from "@/lib/bible-versions";

type ContentPart =
  | string
  | { text?: string; lineBreak?: boolean; noteId?: number; poem?: number };

interface HelloAoContentItem {
  type: string;
  number?: number;
  content?: ContentPart[];
}

interface HelloAoChapter {
  translation?: { id?: string; name?: string };
  chapter: {
    number: number;
    content?: HelloAoContentItem[];
  };
  thisChapterAudioLinks?: { reader: string; url: string }[];
}

export interface FetchedVerse {
  verse: number;
  text: string;
}

export interface FetchedChapter {
  bookId: string;
  bookName: string;
  chapter: number;
  version: string;
  sourceTranslation: string;
  verses: FetchedVerse[];
  audioUrl?: string | null;
}

function flattenContent(parts: ContentPart[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.text) return part.text;
      if (part.lineBreak) return " ";
      return "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHelloAoVerses(data: HelloAoChapter): FetchedVerse[] {
  const items = data.chapter?.content ?? [];
  const verses: FetchedVerse[] = [];
  for (const item of items) {
    if (item.type === "verse" && item.number != null) {
      verses.push({
        verse: item.number,
        text: flattenContent(item.content ?? []),
      });
    }
  }
  return verses;
}

function parseApiBibleContent(content: string): FetchedVerse[] {
  const lines = content.split("\n").filter(Boolean);
  const verses: FetchedVerse[] = [];
  for (const line of lines) {
    const match = line.match(/^\[?(\d+)\]?\s*(.+)/);
    if (match) {
      verses.push({ verse: parseInt(match[1], 10), text: match[2].trim() });
    }
  }
  return verses;
}

export async function fetchBibleChapter(
  versionId: string,
  bookId: string,
  chapterNum: number
): Promise<FetchedChapter> {
  const bookData = BIBLE_BOOKS[bookId];
  const versionData = getVersion(versionId);

  if (!bookData || !versionData) {
    throw new Error("Invalid book or version");
  }

  const helloaoId = versionData.helloaoId ?? "BSB";
  const apiKey = process.env.API_BIBLE_KEY;

  if (apiKey && versionData.apiBibleId) {
    try {
      const url = `https://api.scripture.api.bible/v1/bibles/${versionData.apiBibleId}/chapters/${bookId}.${chapterNum}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;
      const res = await fetch(url, {
        headers: { "api-key": apiKey },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const content: string = data.data?.content ?? "";
        const verses = parseApiBibleContent(content);
        if (verses.length > 0) {
          return {
            bookId: bookData.id,
            bookName: bookData.name,
            chapter: chapterNum,
            version: versionData.id,
            sourceTranslation: versionData.name,
            verses,
          };
        }
      }
    } catch {
      // fall through
    }
  }

  const apiBookId = getHelloaoBookId(bookData.id);
  const url = `https://bible.helloao.org/api/${helloaoId}/${apiBookId}/${chapterNum}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Chapter not found");
  }

  const data: HelloAoChapter = await res.json();
  const verses = parseHelloAoVerses(data);
  if (verses.length === 0) {
    throw new Error("No verses found");
  }

  const sourceTranslation =
    data.translation?.name ?? versionData.fallbackName ?? versionData.name;

  return {
    bookId: bookData.id,
    bookName: bookData.name,
    chapter: chapterNum,
    version: versionData.id,
    sourceTranslation,
    verses,
    audioUrl: data.thisChapterAudioLinks?.[0]?.url ?? null,
  };
}
