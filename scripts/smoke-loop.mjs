/**
 * Lightweight smoke: module graph for core loop files resolves.
 * Full e2e needs Supabase credentials — run locally with Playwright later.
 */
import { createRequire } from "module";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "src/app/page.tsx",
  "src/app/read/[book]/[chapter]/page.tsx",
  "src/app/quiz/[book]/[chapter]/page.tsx",
  "src/lib/ensure-quiz.ts",
  "src/lib/points.ts",
  "public/manifest.webmanifest",
  "public/sw.js",
  "PRODUCT.md",
  "DESIGN.md",
];

let failed = 0;
for (const rel of required) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error("missing:", rel);
    failed++;
  } else {
    console.log("ok:", rel);
  }
}

void createRequire;
process.exit(failed ? 1 : 0);
