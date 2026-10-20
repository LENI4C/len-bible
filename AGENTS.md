<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Len Bible — Agent Context

Everything below this line is maintained by hand, not regenerated. Read it before making non-trivial changes. Product truth lives in `PRODUCT.md`; visual system in `DESIGN.md` when present.

## What this project is

A gamified, chronological (event-order, not canonical-order) Bible reading app. Core loop: read a chapter → auto-detected completion (scroll + minimum time) → short comprehension quiz → points/streak/level, with optional chapter discussion. See README.md and PRODUCT.md.

## Architecture — read this before assuming anything exists

- **Supabase is the backend.** Magic-link auth, profiles, progress RPCs (`mark_chapter_read`, `submit_quiz_answers`), RLS, realtime leaderboard. Client gate: `AppProviders` → `AuthScreen` → `UsernameSelectionScreen` → app shell.
- **Progress is server-backed.** `useProgressStore` loads from Supabase; local persist (`len-bible-prefs`) keeps only preferences like `version` and `bookSummariesSeen`.
- **Leaderboard is global** via `get_leaderboard` RPC + `useLeaderboard` (realtime on `profiles`).
- **Bible text is never stored in our DB** — fetched live from `bible.helloao.org` (default) or `api.scripture.api.bible` (if `API_BIBLE_KEY` is set) in `src/lib/bible-server.ts`, proxied through `/api/bible/...`. Prefer long-lived HTTP cache for immutable chapters.
- **Quizzes are stored in Supabase**, exposed to clients without answers via `quiz_questions_client`; graded server-side. Generation scripts (`scripts/generate-quizzes.ts`) seed the bank; do not send `explanation`/`reviewVerse`/`correct_index` on GET before submit.
- **Version labels (NIV/NLT/AMP/etc.) don't always mean what they say.** `src/lib/bible-versions.ts` maps those names to open translations when no `API_BIBLE_KEY` is present. UI should disclose the actual served translation.

## Known duplicated constants — don't add another copy

`PASS_THRESHOLD` and level thresholds must live in one place (`src/lib/points.ts` / shared quiz constants). Fix all call sites in the same change.

## Conventions

- Path alias `@/` → `src/`.
- Client components are marked `"use client"` explicitly; server-only logic (`bible-server.ts`) must not be imported into client components — go through `/api/*` routes.
- Styling is Tailwind CSS 4 utility classes plus `globals.css` utilities (`glass-card`, `gradient-text`, `prose-bible`, etc.).
- `chapterKey(bookId, chapter)` (`src/lib/books.ts`) is the canonical key format (`"GEN:1"`).
- `CHRONOLOGICAL_ORDER` (`src/lib/chronological-order.ts`) is the core product differentiator — don't reorder casually.

## Commands

```bash
npm run dev              # dev server
npm run dev:clean        # clears .next + starts
npm run lint
npm run typecheck
npm run build
npm run db:migrate
npm run db:seed
npm run quizzes:generate
npm run quizzes:audit
```

## Open, tracked issues an agent should know about

- Quiz coverage may be incomplete until generation/seed finishes for all chapters.
- Quiz question quality depends on generation prompts/content — audit with `quizzes:audit`.
- `src/lib/book-summaries.ts` may still need entries for numbered books.
