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

interface ApiBibleVerse {
  data?: {
    content?: string;
    id?: string;
    orgId?: string;
  };
}

interface ApiBibleChapter {
  data?: {
    content?: string;
    reference?: string;
  };
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
  textSource: "api.bible" | "helloao.org";
  verses: FetchedVerse[];
  audioUrl?: string | null;
}

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";
/** Bible text is immutable — cache aggressively (Next fetch / CDN). */
const IMMUTABLE_FETCH = { next: { revalidate: 60 * 60 * 24 * 30 } } as const;

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

function stripApiBibleMarkup(content: string): string {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse chapter HTML/text that includes verse number spans from API.Bible. */
function parseApiBibleChapterContent(content: string): FetchedVerse[] {
  const verses: FetchedVerse[] = [];
  // Prefer span.v markers when present
  const spanRe = /<span[^>]*data-number="(\d+)"[^>]*>([\s\S]*?)(?=<span[^>]*data-number=|<\/p>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = spanRe.exec(content)) !== null) {
    const verse = parseInt(match[1], 10);
    const text = stripApiBibleMarkup(match[2]);
    if (text) verses.push({ verse, text });
  }
  if (verses.length > 0) return verses.sort((a, b) => a.verse - b.verse);

  // Fallback: split on leading verse numbers in plain text
  const plain = stripApiBibleMarkup(content);
  const parts = plain.split(/(?=\b\d+\s)/);
  for (const part of parts) {
    const m = part.match(/^(\d+)\s+(.+)/);
    if (!m) continue;
    verses.push({ verse: parseInt(m[1], 10), text: m[2].trim() });
  }
  return verses.sort((a, b) => a.verse - b.verse);
}

async function resolveApiBibleId(
  configuredId: string | undefined,
  abbreviation: string,
  apiKey: string
): Promise<string | null> {
  if (configuredId) return configuredId;

  const url = `${API_BIBLE_BASE}/bibles?language=eng&abbreviation=${encodeURIComponent(abbreviation)}`;
  const res = await fetch(url, {
    headers: { "api-key": apiKey },
    ...IMMUTABLE_FETCH,
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { data?: { id: string }[] };
  return body.data?.[0]?.id ?? null;
}

async function fetchApiBibleVerses(
  bibleId: string,
  chapterId: string,
  apiKey: string
): Promise<FetchedVerse[]> {
  // Single chapter request (avoids N+1 per-verse fetches)
  const chapterUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=html&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;
  const chapterRes = await fetch(chapterUrl, {
    headers: { "api-key": apiKey },
    ...IMMUTABLE_FETCH,
  });
  if (chapterRes.ok) {
    const body = (await chapterRes.json()) as ApiBibleChapter;
    const content = body.data?.content ?? "";
    const parsed = parseApiBibleChapterContent(content);
    if (parsed.length > 0) return parsed;
  }

  // Fallback: verse list + batched parallel fetches (still better than serial)
  const listUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}/verses`;
  const listRes = await fetch(listUrl, {
    headers: { "api-key": apiKey },
    ...IMMUTABLE_FETCH,
  });
  if (!listRes.ok) {
    throw new Error(`API.Bible verses list failed (${listRes.status})`);
  }

  const listBody = (await listRes.json()) as { data?: { id: string }[] };
  const refs = listBody.data ?? [];
  if (refs.length === 0) return [];

  const results = await Promise.all(
    refs.map(async (ref) => {
      const verseUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/verses/${ref.id}?content-type=text&include-verse-numbers=false&include-titles=false&include-notes=false`;
      const verseRes = await fetch(verseUrl, {
        headers: { "api-key": apiKey },
        ...IMMUTABLE_FETCH,
      });
      if (!verseRes.ok) return null;
      const verseBody = (await verseRes.json()) as ApiBibleVerse;
      const text = stripApiBibleMarkup(verseBody.data?.content ?? "");
      const tail = ref.id.split(".").pop() ?? "";
      const numMatch = tail.match(/^(\d+)/);
      if (!numMatch || !text) return null;
      return { verse: parseInt(numMatch[1], 10), text } as FetchedVerse;
    })
  );

  return results
    .filter((v): v is FetchedVerse => v != null)
    .sort((a, b) => a.verse - b.verse);
}

async function fetchApiBibleChapterMeta(
  bibleId: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(`${API_BIBLE_BASE}/bibles/${bibleId}`, {
    headers: { "api-key": apiKey },
    ...IMMUTABLE_FETCH,
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { name?: string } };
  return body.data?.name ?? null;
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

  if (apiKey) {
    try {
      const bibleId = await resolveApiBibleId(
        versionData.apiBibleId,
        versionData.abbreviation,
        apiKey
      );

      if (bibleId) {
        const chapterId = `${bookId}.${chapterNum}`;
        const verses = await fetchApiBibleVerses(bibleId, chapterId, apiKey);
        if (verses.length > 0) {
          const translationName =
            (await fetchApiBibleChapterMeta(bibleId, apiKey)) ?? versionData.name;
          return {
            bookId: bookData.id,
            bookName: bookData.name,
            chapter: chapterNum,
            version: versionData.id,
            sourceTranslation: translationName,
            textSource: "api.bible",
            verses,
          };
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("API.Bible fetch failed, using helloao fallback:", err);
      }
    }
  }

  const apiBookId = getHelloaoBookId(bookData.id);
  const url = `https://bible.helloao.org/api/${helloaoId}/${apiBookId}/${chapterNum}.json`;
  const res = await fetch(url, IMMUTABLE_FETCH);
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
    textSource: "helloao.org",
    verses,
    audioUrl: data.thisChapterAudioLinks?.[0]?.url ?? null,
  };
}
