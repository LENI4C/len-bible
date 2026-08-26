export interface BibleVerse {
  verse: number;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reviewVerse?: string;
}

export interface ChapterQuiz {
  bookId: string;
  bookName: string;
  chapter: number;
  questions: QuizQuestion[];
}

export const PASS_THRESHOLD = 0.7;

const STOP_WORDS = new Set([
  "The", "And", "But", "For", "Then", "Now", "So", "He", "She", "They", "It",
  "His", "Her", "Their", "This", "That", "There", "When", "After", "Before",
  "In", "At", "On", "As", "If", "All", "Who", "What", "How", "Why",
]);

const COMMON_NAMES = new Set([
  "God", "Lord", "Jesus", "Christ", "Spirit", "Israel", "David", "Moses",
  "Abraham", "Paul", "Peter", "John", "Mary", "Joseph", "Adam", "Eve",
  "Noah", "Aaron", "Joshua", "Samuel", "Solomon", "Elijah", "Isaiah",
  "Pharaoh", "Jacob", "Isaac", "Sarah", "Rachel", "Leah", "Aaron",
]);

const GENERIC_DISTRACTORS = [
  "A census across the whole empire",
  "A king builds a temple in Jerusalem",
  "The people cross the Red Sea",
  "Jesus feeds five thousand people",
  "Paul writes to the church in Rome",
  "David defeats Goliath",
  "The walls of Jericho fall",
  "Daniel survives a den of lions",
  "Jonah is swallowed by a great fish",
  "The Ten Commandments are given at Sinai",
];

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function simplify(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();
}

function cleanSpeaker(raw: string): string {
  return raw.replace(/^(And|Then|Now|So|But|When|After|Before)\s+/i, "").trim();
}

/** Short, complete phrase for quiz options — no mid-sentence cuts or ellipsis. */
export function readablePhrase(text: string, maxWords = 12): string {
  let s = simplify(text);
  s = s.replace(/^(And|Then|Now|So|But)\s+/i, "");

  const firstSentence = s.split(/[.!?;]/)[0]?.trim() || s;
  const clause = firstSentence.split(/,\s+/)[0]?.trim() || firstSentence;
  const words = clause.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) return clause;

  return words.slice(0, maxWords).join(" ");
}

function normalizeOption(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  return [...new Set(matches.filter((n) => !STOP_WORDS.has(n)))];
}

function extractSaidQuote(text: string): { speaker: string; quote: string } | null {
  const saidMatch = text.match(/^(.+?)\s+said,\s+["'](.+?)["']/i);
  if (saidMatch) {
    return { speaker: cleanSpeaker(saidMatch[1]), quote: saidMatch[2] };
  }
  const colonMatch = text.match(/^(.+?)\s+said:\s+["']?(.+?)["']?\.?$/i);
  if (colonMatch) {
    return { speaker: cleanSpeaker(colonMatch[1]), quote: colonMatch[2] };
  }
  return null;
}

function extractCreatedObject(text: string): string | null {
  const m = text.match(/created(?:\s+the|\s+)?(.+?)(?:\.|,|$)/i);
  if (m) return readablePhrase(m[1].trim(), 8);
  return null;
}

function extractCalledName(text: string): { subject: string; name: string } | null {
  const m = text.match(/called(?:\s+the|\s+)?(.+?)\s+["']([^"']+)["']/i);
  if (m) return { subject: readablePhrase(m[1].trim(), 4), name: m[2] };
  const m2 = text.match(/called\s+["']([^"']+)["']/i);
  if (m2) return { subject: "it", name: m2[1] };
  return null;
}

function buildOptions(
  correct: string,
  wrongPool: string[],
  rand: () => number,
  count = 4
): { options: string[]; correctIndex: number } | null {
  const correctNorm = normalizeOption(correct);
  const seen = new Set<string>([correctNorm]);

  const uniqueWrong: string[] = [];
  for (const raw of wrongPool) {
    const opt = readablePhrase(raw, 12);
    const norm = normalizeOption(opt);
    if (opt.length < 4 || norm === correctNorm || seen.has(norm)) continue;
    if (correctNorm.includes(norm) || norm.includes(correctNorm)) continue;
    seen.add(norm);
    uniqueWrong.push(opt);
  }

  const extras = shuffleWithSeed(GENERIC_DISTRACTORS, rand).filter((d) => {
    const norm = normalizeOption(d);
    return !seen.has(norm) && norm !== correctNorm;
  });

  for (const e of extras) {
    if (uniqueWrong.length >= count - 1) break;
    const norm = normalizeOption(e);
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueWrong.push(e);
    }
  }

  if (uniqueWrong.length < 3) return null;

  const options = shuffleWithSeed([correct, ...uniqueWrong.slice(0, 3)], rand).map((o) =>
    readablePhrase(o, 10)
  );
  const correctNormAfter = normalizeOption(readablePhrase(correct, 10));
  const correctIndex = options.findIndex((o) => normalizeOption(o) === correctNormAfter);
  if (correctIndex < 0) return null;

  return { options, correctIndex };
}

interface QuestionDraft {
  question: string;
  correct: string;
  wrongPool: string[];
  explanation: string;
  reviewVerse: string;
  priority: number;
}

export function generateQuizFromVerses(
  bookId: string,
  bookName: string,
  chapter: number,
  verses: BibleVerse[]
): ChapterQuiz {
  const seed = `${bookId}:${chapter}`;
  const rand = seededRandom(seed);
  const drafts: QuestionDraft[] = [];

  if (verses.length === 0) {
    return { bookId, bookName, chapter, questions: [] };
  }

  const allPhrases = verses.map((v) => readablePhrase(v.text));
  const isShortChapter = verses.length <= 4;

  if (!isShortChapter) {
    const opening = verses[0];
    drafts.push({
      question: "What happens at the beginning of this chapter?",
      correct: readablePhrase(opening.text),
      wrongPool: [...allPhrases.slice(1), ...GENERIC_DISTRACTORS],
      explanation: `The chapter opens: "${opening.text}"`,
      reviewVerse: `${bookName} ${chapter}:${opening.verse}`,
      priority: 10,
    });
  }

  if (!isShortChapter && verses.length > 2) {
    const closing = verses[verses.length - 1];
    drafts.push({
      question: "How does this chapter end?",
      correct: readablePhrase(closing.text),
      wrongPool: allPhrases.filter((_, i) => i !== verses.length - 1),
      explanation: `The chapter ends: "${closing.text}"`,
      reviewVerse: `${bookName} ${chapter}:${closing.verse}`,
      priority: 9,
    });
  }

  for (const v of verses) {
    const said = extractSaidQuote(v.text);
    if (said && said.quote.length > 6 && said.speaker.length > 1) {
      drafts.push({
        question: `What did ${said.speaker} say?`,
        correct: readablePhrase(`"${said.quote}"`, 10),
        wrongPool: verses
          .filter((vv) => vv.verse !== v.verse)
          .map((vv) => {
            const other = extractSaidQuote(vv.text);
            return other ? `"${other.quote}"` : vv.text;
          }),
        explanation: `${said.speaker} said: "${said.quote}" (${bookName} ${chapter}:${v.verse})`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
        priority: 10,
      });
      break;
    }
  }

  for (const v of verses) {
    const created = extractCreatedObject(v.text);
    if (created && created.length > 3) {
      drafts.push({
        question: "What does this chapter say was created?",
        correct: created,
        wrongPool: verses
          .filter((vv) => vv.verse !== v.verse)
          .map((vv) => extractCreatedObject(vv.text) ?? vv.text)
          .filter(Boolean) as string[],
        explanation: `"${v.text}" (${bookName} ${chapter}:${v.verse})`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
        priority: 9,
      });
      break;
    }
  }

  for (const v of verses) {
    const named = extractCalledName(v.text);
    if (named) {
      const subjectLabel = named.subject.length > 2 ? named.subject : "something in this chapter";
      drafts.push({
        question: `What name was given to ${subjectLabel}?`,
        correct: named.name,
        wrongPool: [
          ...verses.map((vv) => extractCalledName(vv.text)?.name).filter(Boolean) as string[],
          "Morning", "Evening", "Wilderness", "Covenant", "Sabbath",
        ],
        explanation: `"${v.text}" (${bookName} ${chapter}:${v.verse})`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
        priority: 8,
      });
      break;
    }
  }

  const nameVerses = verses.filter((v) => {
    const names = extractNames(v.text).filter((n) => COMMON_NAMES.has(n));
    return names.length > 0 && v.text.split(/\s+/).length >= 8;
  });

  for (const v of shuffleWithSeed(nameVerses, rand).slice(0, 1)) {
    const names = extractNames(v.text).filter((n) => COMMON_NAMES.has(n));
    const subject = names[0];
    if (!subject) continue;
    drafts.push({
      question: `What happens involving ${subject} in this chapter?`,
      correct: readablePhrase(v.text),
      wrongPool: allPhrases.filter((s) => !s.toLowerCase().includes(subject.toLowerCase())),
      explanation: `"${v.text}" (${bookName} ${chapter}:${v.verse})`,
      reviewVerse: `${bookName} ${chapter}:${v.verse}`,
      priority: 8,
    });
  }

  const storyVerses = verses.filter((v) => v.text.split(/\s+/).length >= 8);
  const pickVerse = storyVerses[Math.floor(rand() * storyVerses.length)] ?? verses[Math.floor(verses.length / 2)];
  drafts.push({
    question: "Which of these events happens in this chapter?",
    correct: readablePhrase(pickVerse.text),
    wrongPool: shuffleWithSeed(GENERIC_DISTRACTORS, rand),
    explanation: `"${pickVerse.text}" (${bookName} ${chapter}:${pickVerse.verse})`,
    reviewVerse: `${bookName} ${chapter}:${pickVerse.verse}`,
    priority: 7,
  });

  const keyMoments = shuffleWithSeed(
    verses.filter((v) => v.text.split(/\s+/).length >= 6),
    rand
  );

  for (const highlight of keyMoments.slice(0, 4)) {
    drafts.push({
      question: "Which statement describes something in this chapter?",
      correct: readablePhrase(highlight.text),
      wrongPool: [
        ...keyMoments.filter((v) => v.verse !== highlight.verse).map((v) => v.text),
        ...GENERIC_DISTRACTORS,
      ],
      explanation: `"${highlight.text}" (${bookName} ${chapter}:${highlight.verse})`,
      reviewVerse: `${bookName} ${chapter}:${highlight.verse}`,
      priority: 6,
    });
  }

  // Genealogy / list chapters: ask about a specific person mentioned
  const personVerses = verses.filter((v) => {
    const m = v.text.match(/^(\w+)\s+(?:was|became|lived|begot|had|died)/i);
    return m && m[1].length > 2;
  });
  if (personVerses.length >= 2) {
    const v = personVerses[Math.floor(rand() * personVerses.length)];
    const person = v.text.match(/^(\w+)/)?.[1];
    if (person) {
      drafts.push({
        question: `What does this chapter tell us about ${person}?`,
        correct: readablePhrase(v.text),
        wrongPool: personVerses.filter((pv) => pv.verse !== v.verse).map((pv) => pv.text),
        explanation: `"${v.text}" (${bookName} ${chapter}:${v.verse})`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
        priority: 7,
      });
    }
  }

  // Short chapters: one question per verse with a distinct line
  if (isShortChapter) {
    for (const v of verses) {
      const phrase = readablePhrase(v.text, 10);
      if (phrase.length < 6) continue;
      drafts.push({
        question: "Which of these lines appears in this chapter?",
        correct: phrase,
        wrongPool: [
          ...verses.filter((vv) => vv.verse !== v.verse).map((vv) => vv.text),
          ...GENERIC_DISTRACTORS,
        ],
        explanation: `"${v.text}" (${bookName} ${chapter}:${v.verse})`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
        priority: 10,
      });
    }

    drafts.push({
      question: "Which of these events happens in this chapter?",
      correct: readablePhrase(verses[0].text),
      wrongPool: GENERIC_DISTRACTORS,
      explanation: `"${verses[0].text}" (${bookName} ${chapter}:${verses[0].verse})`,
      reviewVerse: `${bookName} ${chapter}:${verses[0].verse}`,
      priority: 8,
    });

    if (verses.length > 1) {
      drafts.push({
        question: "Which statement describes something in this chapter?",
        correct: readablePhrase(verses[verses.length - 1].text),
        wrongPool: verses.slice(0, -1).map((v) => v.text),
        explanation: `"${verses[verses.length - 1].text}" (${bookName} ${chapter}:${verses[verses.length - 1].verse})`,
        reviewVerse: `${bookName} ${chapter}:${verses[verses.length - 1].verse}`,
        priority: 7,
      });
    }
  }

  const sorted = drafts.sort((a, b) => b.priority - a.priority);
  const questions: QuizQuestion[] = [];
  const usedCorrect = new Set<string>();

  for (const d of sorted) {
    if (questions.length >= 4) break;

    const correct = readablePhrase(d.correct, 12);
    const correctKey = normalizeOption(correct);
    const questionKey = `${d.question.slice(0, 20)}:${correctKey}`;
    if (usedCorrect.has(questionKey)) continue;

    const built = buildOptions(correct, d.wrongPool, rand);
    if (!built) continue;

    usedCorrect.add(questionKey);
    questions.push({
      id: questions.length + 1,
      question: d.question,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: d.explanation,
      reviewVerse: d.reviewVerse,
    });
  }

  return { bookId, bookName, chapter, questions };
}

export function countWords(verses: BibleVerse[]): number {
  return verses.reduce((sum, v) => sum + v.text.split(/\s+/).length, 0);
}

export function minReadTimeMs(verses: BibleVerse[]): number {
  const words = countWords(verses);
  if (words < 150) return 5000;
  if (words < 400) return 10000;
  if (words < 800) return 18000;
  if (words < 1500) return 28000;
  return 40000;
}

export function scrollThresholdPercent(): number {
  return 72;
}
