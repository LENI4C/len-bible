export interface BibleBook {
  id: string;
  name: string;
  shortName: string;
  chapters: number;
  testament: "OT" | "NT";
}

export const BIBLE_BOOKS: Record<string, BibleBook> = {
  GEN: { id: "GEN", name: "Genesis", shortName: "Gen", chapters: 50, testament: "OT" },
  JOB: { id: "JOB", name: "Job", shortName: "Job", chapters: 42, testament: "OT" },
  EXO: { id: "EXO", name: "Exodus", shortName: "Exo", chapters: 40, testament: "OT" },
  LEV: { id: "LEV", name: "Leviticus", shortName: "Lev", chapters: 27, testament: "OT" },
  NUM: { id: "NUM", name: "Numbers", shortName: "Num", chapters: 36, testament: "OT" },
  DEU: { id: "DEU", name: "Deuteronomy", shortName: "Deu", chapters: 34, testament: "OT" },
  JOS: { id: "JOS", name: "Joshua", shortName: "Jos", chapters: 24, testament: "OT" },
  JDG: { id: "JDG", name: "Judges", shortName: "Jdg", chapters: 21, testament: "OT" },
  RUT: { id: "RUT", name: "Ruth", shortName: "Rut", chapters: 4, testament: "OT" },
  "1SA": { id: "1SA", name: "1 Samuel", shortName: "1 Sam", chapters: 31, testament: "OT" },
  "2SA": { id: "2SA", name: "2 Samuel", shortName: "2 Sam", chapters: 24, testament: "OT" },
  "1CH": { id: "1CH", name: "1 Chronicles", shortName: "1 Chr", chapters: 29, testament: "OT" },
  PSA: { id: "PSA", name: "Psalms", shortName: "Ps", chapters: 150, testament: "OT" },
  SNG: { id: "SNG", name: "Song of Songs", shortName: "Song", chapters: 8, testament: "OT" },
  PRO: { id: "PRO", name: "Proverbs", shortName: "Prov", chapters: 31, testament: "OT" },
  ECC: { id: "ECC", name: "Ecclesiastes", shortName: "Eccl", chapters: 12, testament: "OT" },
  "1KI": { id: "1KI", name: "1 Kings", shortName: "1 Kgs", chapters: 22, testament: "OT" },
  "2KI": { id: "2KI", name: "2 Kings", shortName: "2 Kgs", chapters: 25, testament: "OT" },
  "2CH": { id: "2CH", name: "2 Chronicles", shortName: "2 Chr", chapters: 36, testament: "OT" },
  ISA: { id: "ISA", name: "Isaiah", shortName: "Isa", chapters: 66, testament: "OT" },
  JER: { id: "JER", name: "Jeremiah", shortName: "Jer", chapters: 52, testament: "OT" },
  LAM: { id: "LAM", name: "Lamentations", shortName: "Lam", chapters: 5, testament: "OT" },
  HOS: { id: "HOS", name: "Hosea", shortName: "Hos", chapters: 14, testament: "OT" },
  JOL: { id: "JOL", name: "Joel", shortName: "Joel", chapters: 3, testament: "OT" },
  AMO: { id: "AMO", name: "Amos", shortName: "Amos", chapters: 9, testament: "OT" },
  OBA: { id: "OBA", name: "Obadiah", shortName: "Obad", chapters: 1, testament: "OT" },
  JON: { id: "JON", name: "Jonah", shortName: "Jonah", chapters: 4, testament: "OT" },
  MIC: { id: "MIC", name: "Micah", shortName: "Mic", chapters: 7, testament: "OT" },
  NAH: { id: "NAH", name: "Nahum", shortName: "Nah", chapters: 3, testament: "OT" },
  HAB: { id: "HAB", name: "Habakkuk", shortName: "Hab", chapters: 3, testament: "OT" },
  ZEP: { id: "ZEP", name: "Zephaniah", shortName: "Zeph", chapters: 3, testament: "OT" },
  EZK: { id: "EZK", name: "Ezekiel", shortName: "Ezek", chapters: 48, testament: "OT" },
  DAN: { id: "DAN", name: "Daniel", shortName: "Dan", chapters: 12, testament: "OT" },
  EZR: { id: "EZR", name: "Ezra", shortName: "Ezra", chapters: 10, testament: "OT" },
  EST: { id: "EST", name: "Esther", shortName: "Est", chapters: 10, testament: "OT" },
  NEH: { id: "NEH", name: "Nehemiah", shortName: "Neh", chapters: 13, testament: "OT" },
  HAG: { id: "HAG", name: "Haggai", shortName: "Hag", chapters: 2, testament: "OT" },
  ZEC: { id: "ZEC", name: "Zechariah", shortName: "Zech", chapters: 14, testament: "OT" },
  MAL: { id: "MAL", name: "Malachi", shortName: "Mal", chapters: 4, testament: "OT" },
  MAT: { id: "MAT", name: "Matthew", shortName: "Matt", chapters: 28, testament: "NT" },
  MRK: { id: "MRK", name: "Mark", shortName: "Mark", chapters: 16, testament: "NT" },
  LUK: { id: "LUK", name: "Luke", shortName: "Luke", chapters: 24, testament: "NT" },
  JHN: { id: "JHN", name: "John", shortName: "John", chapters: 21, testament: "NT" },
  ACT: { id: "ACT", name: "Acts", shortName: "Acts", chapters: 28, testament: "NT" },
  "1TH": { id: "1TH", name: "1 Thessalonians", shortName: "1 Thess", chapters: 5, testament: "NT" },
  "2TH": { id: "2TH", name: "2 Thessalonians", shortName: "2 Thess", chapters: 3, testament: "NT" },
  "1CO": { id: "1CO", name: "1 Corinthians", shortName: "1 Cor", chapters: 16, testament: "NT" },
  "2CO": { id: "2CO", name: "2 Corinthians", shortName: "2 Cor", chapters: 13, testament: "NT" },
  GAL: { id: "GAL", name: "Galatians", shortName: "Gal", chapters: 6, testament: "NT" },
  ROM: { id: "ROM", name: "Romans", shortName: "Rom", chapters: 16, testament: "NT" },
  JAS: { id: "JAS", name: "James", shortName: "James", chapters: 5, testament: "NT" },
  COL: { id: "COL", name: "Colossians", shortName: "Col", chapters: 4, testament: "NT" },
  PHM: { id: "PHM", name: "Philemon", shortName: "Phlm", chapters: 1, testament: "NT" },
  EPH: { id: "EPH", name: "Ephesians", shortName: "Eph", chapters: 6, testament: "NT" },
  PHP: { id: "PHP", name: "Philippians", shortName: "Phil", chapters: 4, testament: "NT" },
  "1PE": { id: "1PE", name: "1 Peter", shortName: "1 Pet", chapters: 5, testament: "NT" },
  "2PE": { id: "2PE", name: "2 Peter", shortName: "2 Pet", chapters: 3, testament: "NT" },
  HEB: { id: "HEB", name: "Hebrews", shortName: "Heb", chapters: 13, testament: "NT" },
  "1TI": { id: "1TI", name: "1 Timothy", shortName: "1 Tim", chapters: 6, testament: "NT" },
  TIT: { id: "TIT", name: "Titus", shortName: "Titus", chapters: 3, testament: "NT" },
  "2TI": { id: "2TI", name: "2 Timothy", shortName: "2 Tim", chapters: 4, testament: "NT" },
  JUD: { id: "JUD", name: "Jude", shortName: "Jude", chapters: 1, testament: "NT" },
  "1JN": { id: "1JN", name: "1 John", shortName: "1 John", chapters: 5, testament: "NT" },
  "2JN": { id: "2JN", name: "2 John", shortName: "2 John", chapters: 1, testament: "NT" },
  "3JN": { id: "3JN", name: "3 John", shortName: "3 John", chapters: 1, testament: "NT" },
  REV: { id: "REV", name: "Revelation", shortName: "Rev", chapters: 22, testament: "NT" },
};

export function getBook(id: string): BibleBook | undefined {
  return BIBLE_BOOKS[id];
}

export function chapterKey(bookId: string, chapter: number): string {
  return `${bookId}:${chapter}`;
}
