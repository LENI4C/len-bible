/**
 * Seed sample quizzes from scripts/sample-quiz-output.json (no Anthropic key needed).
 * Run after migrations: npx tsx scripts/seed-sample-quizzes.ts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = ".env.local";
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

interface SampleFile {
  chapters: Record<string, { questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    review_verse: string;
  }> }>;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const sample: SampleFile = JSON.parse(readFileSync("scripts/sample-quiz-output.json", "utf8"));

  let inserted = 0;
  let skipped = 0;

  for (const [key, data] of Object.entries(sample.chapters)) {
    const [bookId, chapterStr] = key.split(":");
    const chapter = parseInt(chapterStr, 10);

    const { count } = await supabase
      .from("quiz_questions")
      .select("*", { count: "exact", head: true })
      .eq("book_id", bookId)
      .eq("chapter", chapter);

    if ((count ?? 0) >= 4) {
      skipped++;
      continue;
    }

    const rows = data.questions.map((q, i) => ({
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
    inserted++;
    console.log(`  ✓ ${bookId} ${chapter}`);
  }

  console.log(`\nDone: ${inserted} chapters inserted, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
