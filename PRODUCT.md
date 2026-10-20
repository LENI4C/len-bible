# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are people who want a habitual, comprehension-first Bible reading practice—especially those who find canonical book order confusing or who abandon generic reading plans. They open the app in short daily sessions (phone or desktop) to continue a chronological journey, prove understanding with a short quiz, and optionally discuss a verse.

Secondary audiences: small-group leaders who want shared accountability via a global leaderboard; curious first-time readers who need book context before diving in.

## Product Purpose

Len Bible makes Scripture reading sticky by combining chronological (event-order) reading, auto-detected chapter completion, comprehension quizzes, streaks/points/levels, chapter discussion, and synced progress. Success means users return for consecutive days, complete chapters with understanding (quiz pass), and progress through the 66-book chronological path without friction.

## Positioning

The meaningfully different mechanism is **gamified chronological (event-order) reading with server-backed comprehension checks**—not a Bible search engine, not a study commentary library, and not a canonical-order reader with a streak badge bolted on. Neighboring products may offer plans or streaks; Len Bible’s core claim is finishing chapters in story order and proving you understood them.

## Operating Context

- Magic-link auth (Supabase), username profile, synced progress.
- Core loop: Journey → Read chapter → scroll + dwell completion → Quiz → Review (on misses) → next chronological chapter; Discuss optional from verse/chapter.
- Bible text fetched live (API.Bible when keyed, else helloao.org open translations); quizzes stored in Supabase and graded server-side.
- Habit cues: streak, points, levels, global leaderboard, in-app reading reminder.

## Capabilities and Constraints

**Confirmed capabilities:** chronological unlock journey; chapter read + audio when available; quizzes (seeded/generated bank); discuss threads/replies; profile version preference; realtime leaderboard.

**Constraints:** Licensed translation labels (NIV/etc.) may map to open fallbacks without `API_BIBLE_KEY`. Quiz quality depends on generation/seed content. No native apps; no push notifications yet. Discuss is chapter-scoped, not a full social graph.

**Open / evolving:** daily goals, streak freezes, badges, PWA/offline, public marketing landing—tracked as excellence-program work.

## Brand Commitments

- Name: **Len Bible**.
- Voice: warm, clear, confident—not hypey (“elevate/unleash”) and not churchy jargon-heavy.
- Visual refine path: keep the incumbent dark purple/gold identity unless a formal critique proves it cannot compete; no purple-on-white SaaS rebrand by default.

## Evidence on Hand

- README feature list and setup docs; `public/screenshots/dashboard.png`.
- Chronological order in `src/lib/chronological-order.ts`.
- Supabase migrations under `supabase/migrations/`.
- No fabricated testimonials or user metrics on hand—do not invent social proof.

## Product Principles

1. **Comprehension completes the win** — reading without understanding is incomplete; quizzes are part of the habit, not optional garnish.
2. **Chronology is the product** — event order stays the primary path; do not casually reorder.
3. **Trust the loop** — progress writes must be reliable; answers must not leak before submit.
4. **Warm craft, calm reading** — celebrate wins; keep the reading surface quiet and comfortable.
5. **Honest labels** — show what translation the user actually receives.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the core loop (auth, read, quiz, nav): keyboard operable, visible focus, skip link, live regions for status, respect `prefers-reduced-motion`. Scripture text must remain readable (measure, contrast, scalable type).
