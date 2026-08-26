import { BIBLE_BOOKS } from "./books";

/** Chronological reading order from DOC-20260812-WA0009.pdf */
export const CHRONOLOGICAL_ORDER: string[] = [
  "GEN", "JOB", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT",
  "1SA", "2SA", "1CH", "PSA", "SNG", "PRO", "ECC", "1KI", "2KI", "2CH",
  "ISA", "JER", "LAM", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAH",
  "HAB", "ZEP", "EZK", "DAN", "EZR", "EST", "NEH", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "1TH", "2TH", "1CO", "2CO", "GAL",
  "ROM", "JAS", "COL", "PHM", "EPH", "PHP", "1PE", "2PE", "HEB", "1TI",
  "TIT", "2TI", "JUD", "1JN", "2JN", "3JN", "REV",
];

export interface ChronologicalItem {
  order: number;
  bookId: string;
  bookName: string;
  chapters: number;
  testament: "OT" | "NT";
}

export function getChronologicalItems(): ChronologicalItem[] {
  return CHRONOLOGICAL_ORDER.map((bookId, index) => {
    const book = BIBLE_BOOKS[bookId];
    return {
      order: index + 1,
      bookId,
      bookName: book.name,
      chapters: book.chapters,
      testament: book.testament,
    };
  });
}

export function getTotalChapters(): number {
  return CHRONOLOGICAL_ORDER.reduce(
    (sum, id) => sum + BIBLE_BOOKS[id].chapters,
    0
  );
}

export function getNextChapter(
  bookId: string,
  chapter: number
): { bookId: string; chapter: number } | null {
  const book = BIBLE_BOOKS[bookId];
  if (chapter < book.chapters) {
    return { bookId, chapter: chapter + 1 };
  }
  const idx = CHRONOLOGICAL_ORDER.indexOf(bookId);
  if (idx === -1 || idx === CHRONOLOGICAL_ORDER.length - 1) return null;
  return { bookId: CHRONOLOGICAL_ORDER[idx + 1], chapter: 1 };
}

export function getPrevChapter(
  bookId: string,
  chapter: number
): { bookId: string; chapter: number } | null {
  if (chapter > 1) {
    return { bookId, chapter: chapter - 1 };
  }
  const idx = CHRONOLOGICAL_ORDER.indexOf(bookId);
  if (idx <= 0) return null;
  const prevBookId = CHRONOLOGICAL_ORDER[idx - 1];
  return { bookId: prevBookId, chapter: BIBLE_BOOKS[prevBookId].chapters };
}

export function getGlobalChapterIndex(bookId: string, chapter: number): number {
  let index = 0;
  for (const id of CHRONOLOGICAL_ORDER) {
    if (id === bookId) {
      return index + chapter;
    }
    index += BIBLE_BOOKS[id].chapters;
  }
  return index;
}
