/**
 * Generate pre-built LLM quizzes and insert into Supabase quiz_questions.
 *
 * Usage:
 *   npx tsx scripts/generate-quizzes.ts                    # all chapters (resumable)
 *   npx tsx scripts/generate-quizzes.ts --sample           # Genesis 1-3 + Exodus 14
 *   npx tsx scripts/generate-quizzes.ts --book GEN --chapter 1
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { CHRONOLOGICAL_ORDER } from "../src/lib/chronological-order";
import { BIBLE_BOOKS } from "../src/lib/books";
import { fetchBibleChapter } from "../src/lib/bible-server";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

interface GeneratedQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  review_verse: string;
}

interface GeneratedQuiz {
  questions: GeneratedQuestion[];
}

const SAMPLE_CHAPTERS: { bookId: string; chapter: number }[] = [
  { bookId: "GEN", chapter: 1 },
  { bookId: "GEN", chapter: 2 },
  { bookId: "GEN", chapter: 3 },
  { bookId: "EXO", chapter: 14 },
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildPrompt(bookName: string, chapter: number, verses: { verse: number; text: string }[]): string {
  const text = verses.map((v) => `${v.verse}. ${v.text}`).join("\n");
  return `You are creating comprehension quiz questions for ${bookName} chapter ${chapter}.

CHAPTER TEXT:
${text}

Generate exactly 4 multiple-choice questions that test UNDERSTANDING of:
- Events and their sequence
- Cause and effect
- Roles of named people/entities
- Main ideas of the chapter

DO NOT create trivia like "which line appears" or "how does the chapter begin/end" verbatim matching.
Distractors must be plausible wrong answers grounded in THIS chapter's actual content (other events, misattributed speakers, reversed sequence).

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "Brief explanation referencing the passage",
      "review_verse": "${bookName} ${chapter}:1"
    }
  ]
}`;
}

function validateQuiz(data: unknown): GeneratedQuiz {
  if (!data || typeof data !== "object") throw new Error("Invalid JSON shape");
  const obj = data as GeneratedQuiz;
  if (!Array.isArray(obj.questions) || obj.questions.length !== 4) {
    throw new Error("Expected exactly 4 questions");
  }
  for (const q of obj.questions) {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error("Invalid question/options");
    }
    if (q.correct_index < 0 || q.correct_index > 3) throw new Error("Invalid correct_index");
    if (!q.explanation || !q.review_verse) throw new Error("Missing explanation or review_verse");
    if (/which of these lines appears/i.test(q.question)) {
      throw new Error("Generic template question rejected");
    }
  }
  return obj;
}

async function chapterExists(supabase: ReturnType<typeof getSupabase>, bookId: string, chapter: number): Promise<boolean> {
  const { count } = await supabase
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("chapter", chapter);
  return (count ?? 0) >= 4;
}

async function generateForChapter(
  anthropic: Anthropic,
  supabase: ReturnType<typeof getSupabase>,
  bookId: string,
  chapter: number
): Promise<"skipped" | "generated" | "failed"> {
  if (await chapterExists(supabase, bookId, chapter)) {
    return "skipped";
  }

  const book = BIBLE_BOOKS[bookId];
  if (!book) return "failed";

  try {
    const fetched = await fetchBibleChapter("NIV", bookId, chapter);
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(book.name, chapter, fetched.verses) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text in response");

    const jsonStr = textBlock.text.replace(/```json\n?|\n?```/g, "").trim();
    const quiz = validateQuiz(JSON.parse(jsonStr));

    const rows = quiz.questions.map((q, i) => ({
      book_id: bookId,
      chapter,
      question_id: i + 1,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      review_verse: q.review_verse,
    }));

    const { error } = await supabase.from("quiz_questions").insert(rows);
    if (error) throw error;

    return "generated";
  } catch (e) {
    console.error(`FAILED ${bookId} ${chapter}:`, e instanceof Error ? e.message : e);
    return "failed";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sample = args.includes("--sample");
  const bookIdx = args.indexOf("--book");
  const chapterIdx = args.indexOf("--chapter");

  const supabase = getSupabase();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let chapters: { bookId: string; chapter: number }[] = [];

  if (bookIdx >= 0 && chapterIdx >= 0) {
    chapters = [{ bookId: args[bookIdx + 1].toUpperCase(), chapter: parseInt(args[chapterIdx + 1], 10) }];
  } else if (sample) {
    chapters = SAMPLE_CHAPTERS;
  } else {
    for (const bookId of CHRONOLOGICAL_ORDER) {
      const book = BIBLE_BOOKS[bookId];
      for (let ch = 1; ch <= book.chapters; ch++) {
        chapters.push({ bookId, chapter: ch });
      }
    }
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const { bookId, chapter } of chapters) {
    process.stdout.write(`\r${bookId} ${chapter}...`);
    const result = await generateForChapter(anthropic, supabase, bookId, chapter);
    if (result === "generated") generated++;
    else if (result === "skipped") skipped++;
    else {
      failed++;
      failures.push(`${bookId}:${chapter}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const report = { generated, skipped, failed, failures, total: chapters.length };
  writeFileSync("scripts/quiz-generation-report.json", JSON.stringify(report, null, 2));

  console.log("\n\n=== QUIZ GENERATION ===");
  console.log(report);
  console.log("Report: scripts/quiz-generation-report.json");
}

main();
