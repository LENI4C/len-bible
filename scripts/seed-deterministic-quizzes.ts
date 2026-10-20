/**
 * Seed quizzes for every chronological chapter using the deterministic generator.
 * Resumable; skips chapters that already have 4 questions.
 *
 * Usage: npx tsx scripts/seed-deterministic-quizzes.ts [--limit N]
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { CHRONOLOGICAL_ORDER } from "../src/lib/chronological-order";
import { BIBLE_BOOKS } from "../src/lib/books";
import { fetchBibleChapter } from "../src/lib/bible-server";
import { generateQuizFromVerses } from "../src/lib/quiz-generator";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const bookId of CHRONOLOGICAL_ORDER) {
    const bookData = BIBLE_BOOKS[bookId];
    if (!bookData) continue;

    for (let chapter = 1; chapter <= bookData.chapters; chapter++) {
      if (processed >= limit) break;
      processed++;

      const { count } = await supabase
        .from("quiz_questions")
        .select("*", { count: "exact", head: true })
        .eq("book_id", bookId)
        .eq("chapter", chapter);

      if ((count ?? 0) >= 4) {
        skipped++;
        continue;
      }

      try {
        const fetched = await fetchBibleChapter("NIV", bookId, chapter);
        const quiz = generateQuizFromVerses(
          bookId,
          bookData.name,
          chapter,
          fetched.verses
        );

        const rows = quiz.questions.map((q) => ({
          book_id: bookId,
          chapter,
          question_id: q.id,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          review_verse: q.reviewVerse ?? `${bookData.name} ${chapter}:1`,
        }));

        const { error } = await supabase.from("quiz_questions").upsert(rows);
        if (error) throw error;
        inserted++;
        console.log(`  ✓ ${bookId} ${chapter}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${bookId} ${chapter}:`, err instanceof Error ? err.message : err);
      }

      // Be polite to upstream Bible APIs
      await new Promise((r) => setTimeout(r, 80));
    }
    if (processed >= limit) break;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
