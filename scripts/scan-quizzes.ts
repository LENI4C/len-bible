/**
 * Audits quiz quality across all 66 books.
 * Run: npx tsx scripts/scan-quizzes.ts
 */
import { writeFileSync } from "fs";
import { BIBLE_BOOKS, getHelloaoBookId } from "../src/lib/books";
import { CHRONOLOGICAL_ORDER } from "../src/lib/chronological-order";
import { generateQuizFromVerses } from "../src/lib/quiz-generator";

interface FetchedVerse {
  verse: number;
  text: string;
}

async function fetchChapter(bookId: string, chapter: number): Promise<FetchedVerse[] | null> {
  const apiBookId = getHelloaoBookId(bookId);
  const url = `https://bible.helloao.org/api/BSB/${apiBookId}/${chapter}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const verses: FetchedVerse[] = [];
  for (const item of data.chapter?.content ?? []) {
    if (item.type === "verse" && item.number != null) {
      const text = (item.content ?? [])
        .map((p: string | { text?: string; lineBreak?: boolean }) =>
          typeof p === "string" ? p : p.text ?? (p.lineBreak ? " " : "")
        )
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (text) verses.push({ verse: item.number, text });
    }
  }
  return verses.length ? verses : null;
}

function auditQuiz(questions: ReturnType<typeof generateQuizFromVerses>["questions"]): string[] {
  const issues: string[] = [];

  if (questions.length === 0) issues.push("NO_QUESTIONS");
  if (questions.length < 4) issues.push(`FEW_QUESTIONS:${questions.length}`);

  for (const q of questions) {
    if (/verse \d+/i.test(q.question)) issues.push(`VERSE_REF_Q:${q.question.slice(0, 55)}`);
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) issues.push("BAD_CORRECT_INDEX");

    const maxLen = Math.max(...q.options.map((o) => o.length));
    if (maxLen > 90) issues.push(`LONG_OPTION:${maxLen}`);

    if (new Set(q.options).size < q.options.length) issues.push("DUPE_OPTIONS");

    for (const o of q.options) {
      if (/^Something not mentioned/.test(o)) issues.push("PLACEHOLDER_OPTION");
      if (o.endsWith("...") && o.length >= 55) issues.push("TRUNCATED_OPTION");
    }

    const correct = q.options[q.correctIndex];
    if (!correct?.trim()) issues.push("EMPTY_CORRECT");
  }

  return issues;
}

async function main() {
  const allIssues: { bookId: string; chapter: number; issues: string[]; qCount?: number }[] = [];
  let scanned = 0;
  let failed = 0;

  for (const bookId of CHRONOLOGICAL_ORDER) {
    const book = BIBLE_BOOKS[bookId];
    if (!book) continue;

    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        const verses = await fetchChapter(bookId, ch);
        if (!verses) {
          failed++;
          allIssues.push({ bookId, chapter: ch, issues: ["FETCH_FAILED"] });
          continue;
        }

        const quiz = generateQuizFromVerses(bookId, book.name, ch, verses);
        const issues = auditQuiz(quiz.questions);
        if (issues.length) {
          allIssues.push({ bookId, chapter: ch, issues, qCount: quiz.questions.length });
        }
        scanned++;
        if (scanned % 50 === 0) {
          process.stdout.write(`\r${scanned} chapters scanned...`);
        }
      } catch (e) {
        failed++;
        allIssues.push({
          bookId,
          chapter: ch,
          issues: [`ERROR:${e instanceof Error ? e.message : "unknown"}`],
        });
      }
    }
  }

  const byType: Record<string, number> = {};
  for (const entry of allIssues) {
    for (const issue of entry.issues) {
      const type = issue.split(":")[0];
      byType[type] = (byType[type] || 0) + 1;
    }
  }

  const report = {
    scanned,
    failed,
    chaptersWithIssues: allIssues.length,
    byType,
    samples: allIssues.slice(0, 30),
  };

  writeFileSync("scripts/quiz-audit-report.json", JSON.stringify(report, null, 2));

  console.log(`\n=== QUIZ AUDIT ===`);
  console.log(`Scanned: ${scanned}, fetch failures: ${failed}`);
  console.log(`Chapters with issues: ${allIssues.length}`);
  console.log("Issue breakdown:", byType);
  console.log("Full report: scripts/quiz-audit-report.json");
}

main();
