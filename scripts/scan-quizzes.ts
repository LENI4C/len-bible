/**
 * Audits stored quiz_questions in Supabase.
 * Run: npx tsx scripts/scan-quizzes.ts
 */
import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const GENERIC_PATTERNS = [
  /which of these lines appears/i,
  /how does this chapter begin/i,
  /how does this chapter end/i,
  /something not mentioned/i,
];

interface QuizRow {
  book_id: string;
  chapter: number;
  question_id: number;
  question: string;
  options: string[];
  explanation: string;
  review_verse: string;
}

function auditRow(row: QuizRow): string[] {
  const issues: string[] = [];
  if (!row.review_verse?.trim()) issues.push("MISSING_REVIEW_VERSE");
  if (row.options.length !== 4) issues.push("BAD_OPTIONS_COUNT");
  for (const p of GENERIC_PATTERNS) {
    if (p.test(row.question)) issues.push(`GENERIC_TEMPLATE:${row.question.slice(0, 40)}`);
  }
  const norms = row.options.map((o) => o.toLowerCase().trim());
  if (new Set(norms).size < row.options.length) issues.push("DUPE_OPTIONS");
  for (let i = 0; i < norms.length; i++) {
    for (let j = i + 1; j < norms.length; j++) {
      if (norms[i].includes(norms[j]) || norms[j].includes(norms[i])) {
        if (norms[i].length > 10 && norms[j].length > 10) issues.push("NEAR_DUPE_OPTIONS");
      }
    }
  }
  if (Math.max(...row.options.map((o) => o.length)) > 120) issues.push("LONG_OPTION");
  return issues;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase.from("quiz_questions").select("*").order("book_id").order("chapter").order("question_id");

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const allIssues: { book_id: string; chapter: number; issues: string[] }[] = [];
  const byChapter = new Map<string, QuizRow[]>();

  for (const row of rows ?? []) {
    const key = `${row.book_id}:${row.chapter}`;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key)!.push(row as QuizRow);
  }

  for (const [key, chapterRows] of byChapter) {
    const [book_id, chapterStr] = key.split(":");
    const chapter = parseInt(chapterStr, 10);
    const issues: string[] = [];
    if (chapterRows.length < 4) issues.push(`FEW_QUESTIONS:${chapterRows.length}`);
    for (const row of chapterRows) {
      issues.push(...auditRow(row));
    }
    if (issues.length) allIssues.push({ book_id, chapter, issues: [...new Set(issues)] });
  }

  const byType: Record<string, number> = {};
  for (const entry of allIssues) {
    for (const issue of entry.issues) {
      const type = issue.split(":")[0];
      byType[type] = (byType[type] || 0) + 1;
    }
  }

  const report = {
    totalQuestions: rows?.length ?? 0,
    chaptersStored: byChapter.size,
    chaptersWithIssues: allIssues.length,
    byType,
    samples: allIssues.slice(0, 30),
  };

  writeFileSync("scripts/quiz-audit-report.json", JSON.stringify(report, null, 2));
  console.log("=== QUIZ AUDIT (stored) ===");
  console.log(report);
}

main();
