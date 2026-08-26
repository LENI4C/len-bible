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

function extractPhrase(text: string): string | null {
  const words = text.replace(/[“”"']/g, "").split(/\s+/).filter(Boolean);
  if (words.length < 8) return null;
  const start = Math.floor(words.length * 0.25);
  const phrase = words.slice(start, start + 6).join(" ");
  return phrase.length >= 20 ? phrase : null;
}

function extractNumbers(text: string): string[] {
  return text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
}

function extractProperNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  return [...new Set(matches.filter((n) => !["The", "And", "But", "For", "Then", "Now", "So", "He", "She", "They", "God", "Lord"].includes(n)))];
}

function pickIndices(count: number, total: number, rand: () => number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  return shuffleWithSeed(indices, rand).slice(0, count);
}

export function generateQuizFromVerses(
  bookId: string,
  bookName: string,
  chapter: number,
  verses: BibleVerse[]
): ChapterQuiz {
  const seed = `${bookId}:${chapter}`;
  const rand = seededRandom(seed);
  const questions: QuizQuestion[] = [];
  let qId = 1;

  if (verses.length === 0) {
    return { bookId, bookName, chapter, questions: [] };
  }

  // Q1–Q2: Which verse contains this phrase?
  const phraseCandidates = verses
    .map((v, i) => ({ v, i, phrase: extractPhrase(v.text) }))
    .filter((x) => x.phrase);

  for (const { v, phrase } of pickIndices(Math.min(2, phraseCandidates.length), phraseCandidates.length, rand).map(
    (i) => phraseCandidates[i]
  )) {
    const wrongVerses = verses
      .filter((wv) => wv.verse !== v.verse)
      .sort(() => rand() - 0.5)
      .slice(0, 3)
      .map((wv) => `Verse ${wv.verse}`);

    const options = shuffleWithSeed(
      [`Verse ${v.verse}`, ...wrongVerses],
      rand
    );
    questions.push({
      id: qId++,
      question: `Which verse contains the phrase "...${phrase}..."?`,
      options,
      correctIndex: options.indexOf(`Verse ${v.verse}`),
      explanation: `Verse ${v.verse} reads: "${v.text}"`,
      reviewVerse: `${bookName} ${chapter}:${v.verse}`,
    });
  }

  // Q3: Number questions from actual verse text
  const numberVerses = verses.filter((v) => extractNumbers(v.text).length > 0);
  if (numberVerses.length > 0) {
    const v = numberVerses[Math.floor(rand() * numberVerses.length)];
    const nums = extractNumbers(v.text);
    const target = nums[Math.floor(rand() * nums.length)];
    const wrongNums = shuffleWithSeed(
      ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Ten", "Twelve", "Forty", "Seventy"]
        .filter((n) => n.toLowerCase() !== target.toLowerCase() && n !== target)
        .slice(0, 8),
      rand
    ).slice(0, 3);

    const options = shuffleWithSeed([target, ...wrongNums], rand);
    questions.push({
      id: qId++,
      question: `According to verse ${v.verse}, which number appears in the text?`,
      options,
      correctIndex: options.indexOf(target),
      explanation: `Verse ${v.verse} mentions "${target}": "${v.text}"`,
      reviewVerse: `${bookName} ${chapter}:${v.verse}`,
    });
  }

  // Q4: Who is mentioned?
  const nameVerses = verses.filter((v) => extractProperNames(v.text).length > 0);
  if (nameVerses.length > 0) {
    const v = nameVerses[Math.floor(rand() * nameVerses.length)];
    const names = extractProperNames(v.text);
    const correct = names[Math.floor(rand() * names.length)];
    const allNames = verses.flatMap((vv) => extractProperNames(vv.text));
    const wrongNames = shuffleWithSeed(
      [...new Set(allNames.filter((n) => n !== correct))],
      rand
    ).slice(0, 3);

    if (wrongNames.length >= 2) {
      const options = shuffleWithSeed([correct, ...wrongNames.slice(0, 3)], rand);
      questions.push({
        id: qId++,
        question: `Who is mentioned in verse ${v.verse} of ${bookName} chapter ${chapter}?`,
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Verse ${v.verse} mentions ${correct}: "${v.text}"`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
      });
    }
  }

  // Q5: Complete the verse opening
  const longVerses = verses.filter((v) => v.text.split(/\s+/).length >= 10);
  if (longVerses.length > 0) {
    const v = longVerses[Math.floor(rand() * longVerses.length)];
    const words = v.text.split(/\s+/);
    const opening = words.slice(0, 5).join(" ");
    const wrongOpenings = shuffleWithSeed(
      longVerses.filter((lv) => lv.verse !== v.verse),
      rand
    )
      .slice(0, 3)
      .map((lv) => lv.text.split(/\s+/).slice(0, 5).join(" "));

    if (wrongOpenings.length >= 2) {
      const options = shuffleWithSeed([opening, ...wrongOpenings], rand);
      questions.push({
        id: qId++,
        question: `How does verse ${v.verse} begin?`,
        options,
        correctIndex: options.indexOf(opening),
        explanation: `Verse ${v.verse} begins: "${opening}..."`,
        reviewVerse: `${bookName} ${chapter}:${v.verse}`,
      });
    }
  }

  // Q6: Chapter content — which statement is true based on the text?
  const midVerse = verses[Math.floor(verses.length / 2)];
  const trueStatement = `Verse ${midVerse.verse} says: "${midVerse.text.length > 100 ? midVerse.text.slice(0, 97) + "..." : midVerse.text}"`;
  const falseStatements = shuffleWithSeed(
    verses.filter((v) => v.verse !== midVerse.verse),
    rand
  )
    .slice(0, 3)
    .map(
      (v) =>
        `Verse ${v.verse} says: "${v.text.split(/\s+/).slice(0, 8).join(" ")}..." (this is from a different verse)`
    );

  if (falseStatements.length >= 2) {
    const fakeOptions = shuffleWithSeed(verses, rand)
      .slice(0, 3)
      .map((v) => {
        const words = v.text.split(/\s+/);
        const fake = [...words.slice(0, 3), "[different content]", ...words.slice(-3)].join(" ");
        return `Verse ${midVerse.verse} says: "${fake}"`;
      });

    const options = shuffleWithSeed([trueStatement, ...fakeOptions.slice(0, 3)], rand);
    questions.push({
      id: qId++,
      question: `Which statement accurately reflects ${bookName} ${chapter}:${midVerse.verse}?`,
      options,
      correctIndex: options.indexOf(trueStatement),
      explanation: `The correct text of verse ${midVerse.verse} is: "${midVerse.text}"`,
      reviewVerse: `${bookName} ${chapter}:${midVerse.verse}`,
    });
  }

  // Ensure at least 4 questions — fill with verse content questions
  while (questions.length < 4 && verses.length >= 4) {
    const usedVerses = new Set(questions.map((q) => q.reviewVerse));
    const available = verses.filter(
      (v) => !usedVerses.has(`${bookName} ${chapter}:${v.verse}`)
    );
    if (available.length === 0) break;

    const v = available[Math.floor(rand() * available.length)];
    const wrongVerses = shuffleWithSeed(
      verses.filter((wv) => wv.verse !== v.verse),
      rand
    ).slice(0, 3);

    const options = shuffleWithSeed(
      [
        v.text.length > 80 ? v.text.slice(0, 77) + "..." : v.text,
        ...wrongVerses.map((wv) =>
          wv.text.length > 80 ? wv.text.slice(0, 77) + "..." : wv.text
        ),
      ],
      rand
    );

    questions.push({
      id: qId++,
      question: `Which of these is the text of verse ${v.verse}?`,
      options,
      correctIndex: 0,
      explanation: `Verse ${v.verse}: "${v.text}"`,
      reviewVerse: `${bookName} ${chapter}:${v.verse}`,
    });
    // Fix correctIndex after shuffle — recalculate
    const correctText =
      v.text.length > 80 ? v.text.slice(0, 77) + "..." : v.text;
    questions[questions.length - 1].correctIndex = options.indexOf(correctText);
  }

  return {
    bookId,
    bookName,
    chapter,
    questions: questions
      .filter((q) => q.correctIndex >= 0 && q.options.length >= 2)
      .slice(0, 5),
  };
}

export function countWords(verses: BibleVerse[]): number {
  return verses.reduce((sum, v) => sum + v.text.split(/\s+/).length, 0);
}

export function minReadTimeMs(verses: BibleVerse[]): number {
  const words = countWords(verses);
  // ~180 wpm reading speed minimum; floor 20s, cap 8 min
  const calculated = Math.ceil((words / 180) * 60 * 1000);
  return Math.max(20000, Math.min(calculated, 480000));
}
