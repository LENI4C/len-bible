# Contributing to Len Bible

Thank you for helping make Len Bible better! This guide covers everything you need to get started.

## Development setup

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later (comes with Node)

### Install and run

```bash
git clone https://github.com/LENI4C/len-bible.git
cd len-bible
npm install
cp .env.example .env.local   # optional — see Environment variables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the onboarding screen.

If the dev server fails to start (stale lock from a crashed process):

```bash
npm run dev:clean
```

### Environment variables

Only one variable is used in the codebase:

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BIBLE_KEY` | No | [API.Bible](https://scripture.api.bible/) key for licensed translations |

See `.env.example` for details. Without a key, the app works fully using free translations from [helloao.org](https://bible.helloao.org/).

## Branch naming

Create branches from `main` using these prefixes:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features (e.g. `feature/audio-narration`) |
| `fix/` | Bug fixes (e.g. `fix/nahum-chapter-load`) |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, dependencies |

## Commit messages

Write clear, imperative commit messages:

```
Add streak freeze for missed days
Fix quiz duplicate options on short Psalms
Update README with deployment steps
```

- First line: concise summary (≤ 72 chars)
- Optional body: explain *why*, not just *what*
- Reference issues when relevant: `Fix #42`

## Before submitting a PR

Run all three checks locally:

```bash
npm run lint        # ESLint (eslint-config-next)
npm run typecheck   # TypeScript (tsc --noEmit)
npm run build       # Production build
```

All must pass. CI runs the same checks on every pull request.

### Quiz quality audit (when touching quiz logic)

```bash
npx tsx scripts/scan-quizzes.ts
```

This scans all ~1,189 chapters and writes a report to `scripts/quiz-audit-report.json`. Aim for zero issues before merging quiz changes.

## How quizzes are generated

Quizzes are **not hardcoded**. They are generated at request time from the actual chapter text.

**Key files:**

| File | Role |
|------|------|
| `src/lib/quiz-generator.ts` | Core logic — `generateQuizFromVerses()` |
| `src/app/api/quiz/[version]/[book]/[chapter]/route.ts` | API route that fetches chapter text and calls the generator |
| `scripts/scan-quizzes.ts` | Full-corpus audit script |

**How `generateQuizFromVerses()` works:**

1. Takes an array of `{ verse, text }` objects from the fetched chapter.
2. Builds question *drafts* from comprehension patterns: opening/closing events, dialogue (`"What did X say?"`), creation/naming, character moments, and short-chapter per-verse lines.
3. Picks the best 4 questions by priority, deduplicates similar ones.
4. Generates 4 multiple-choice options per question using `readablePhrase()` (short, complete phrases — no mid-sentence truncation).
5. Uses a seeded PRNG (`bookId:chapter`) so the same chapter always produces the same quiz.

**Pass threshold:** 70% (`PASS_THRESHOLD` in `quiz-generator.ts`).

Read `src/lib/quiz-generator.ts` before making changes — small edits can affect all 1,189 chapters.

## Adding a new Bible translation

Translations are defined in `src/lib/bible-versions.ts`. Each entry maps a UI label to real text sources:

```typescript
{
  id: "NIV",              // Internal ID used in URLs and store
  name: "New International Version",
  abbreviation: "NIV",
  description: "...",
  helloaoId: "BSB",       // helloao.org translation ID (free fallback)
  fallbackName: "Berean Standard Bible (NIV requires API key)",
  apiBibleId: "06125adad2d5898a-01",  // API.Bible ID (requires API_BIBLE_KEY)
}
```

**Steps:**

1. Add an entry to `BIBLE_VERSIONS` in `src/lib/bible-versions.ts`.
2. Set `helloaoId` to a valid [helloao.org](https://bible.helloao.org/) translation ID (this is the free fallback).
3. Optionally set `apiBibleId` if API.Bible hosts the licensed text (requires `API_BIBLE_KEY`).
4. Test by selecting the version on the Profile page and reading a chapter.
5. Run `npx tsx scripts/scan-quizzes.ts` to verify quiz generation still works.

**Book ID mapping:** Some books use different IDs on helloao.org (e.g. Nahum is `NAM`, not `NAH`). Add `helloaoId` overrides in `src/lib/books.ts` if needed.

## Code style

- Match the existing codebase — read surrounding files before editing.
- **ESLint** config is in `eslint.config.mjs` (extends `eslint-config-next`).
- **TypeScript** strict mode is enabled (`tsconfig.json`).
- Use `@/` path aliases for imports from `src/`.
- Keep components focused; shared logic belongs in `src/lib/` or `src/hooks/`.
- Do not commit secrets, `.env.local`, or generated audit reports.

## Questions?

Open a [GitHub issue](https://github.com/LENI4C/len-bible/issues) or start a [discussion](https://github.com/LENI4C/len-bible/discussions). For bugs, use the bug report template; for ideas, use the feature request template.
