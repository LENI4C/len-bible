[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Len Bible 📜

> A gamified chronological Bible reading app — read, understand, discuss, and track your journey through Scripture.

![Len Bible dashboard — streaks, progress, and continue reading](./public/screenshots/dashboard.png)

## Features

- **Chronological reading** — 66 books in event order (Genesis → Revelation)
- **Real Bible text** — [API.Bible](https://scripture.api.bible/) when licensed, [helloao.org](https://bible.helloao.org/) fallback
- **Comprehension quizzes** — stored in Supabase, graded server-side (answers never exposed to the client)
- **Chapter discussion** — threads and replies per chapter, with verse-level links
- **Auth & sync** — magic-link sign-in, username, progress synced via Supabase
- **Streaks, points, levels, leaderboard** — realtime global leaderboard
- **6 Bible versions** — NIV, NLT, ERV, CJB, AMP, CEB (licensed via API.Bible when key is set)

## Where things appear in the app

| Feature | Route | How to get there |
|---------|-------|------------------|
| **Read chapter** | `/read/[book]/[chapter]` | Journey → pick a book/chapter |
| **Quiz** | `/quiz/[book]/[chapter]` | After finishing a chapter → **Check Your Understanding** |
| **Discuss** | `/discuss/[book]/[chapter]` | **Discuss this chapter** on any read page, or click a verse number |
| **Thread** | `/discuss/.../thread/[id]` | Open a thread from the discuss list |

> **Quizzes:** Sample seed covers Genesis 1–3 and Exodus 14. On first visit, missing chapters auto-generate via the deterministic generator (`ensureQuizQuestions`). For a full pre-seed: `npm run quizzes:seed-all` (or `quizzes:generate` with an Anthropic key for higher quality).

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Backend | [Supabase](https://supabase.com/) (auth, Postgres, Realtime) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| State | [Zustand](https://zustand.docs.pmnd.dev/) + Supabase sync |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Language | TypeScript |

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com/) project (free tier works)

### Install

```bash
git clone https://github.com/LENI4C/len-bible.git
cd len-bible
npm install
cp .env.example .env.local
```

### Supabase setup

See [supabase/README.md](supabase/README.md) for full steps. Short version:

1. Create a Supabase project and copy URL + anon key + service role key into `.env.local`
2. Run migrations: `npm run db:migrate` (needs `DATABASE_URL` or `SUPABASE_DB_PASSWORD`)
3. Seed sample quizzes: `npm run db:seed`
4. Enable **Email** auth and add redirect URLs: `http://localhost:3000/auth/callback` (+ your production URL)

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only — quiz fetch, scripts (never expose to browser) |
| `API_BIBLE_KEY` | No | [API.Bible](https://scripture.api.bible/signup) key for NIV, NLT, etc. |
| `ANTHROPIC_API_KEY` | No | For `npm run quizzes:generate` only |
| `DATABASE_URL` / `SUPABASE_DB_PASSWORD` | Migrations only | Local `npm run db:migrate` |

Run `npm run bible:ids` with `API_BIBLE_KEY` set to list translation IDs licensed on your account.

### Run locally

```bash
npm run dev          # starts dev server (auto-clears stale lock)
npm run dev:clean    # clears .next cache + starts dev server
```

Open **http://localhost:3000** — sign in with a magic link, pick a username, then start reading.

### Deploy to Vercel

1. Push to `main` (or connect the repo in Vercel)
2. Add all env vars from the table above in Vercel → Settings → Environment Variables
3. Add production auth redirect: `https://your-domain.vercel.app/auth/callback`
4. Re-run migrations + seed on your Supabase project if not done yet

### Scripts

```bash
npm run lint              # ESLint
npm run typecheck         # TypeScript check
npm run build             # Production build
npm run db:migrate        # Apply Supabase migrations
npm run db:seed           # Seed Genesis 1–3 + Exodus 14 quizzes
npm run quizzes:generate  # Generate full quiz bank (Anthropic key)
npm run quizzes:audit     # Audit quiz quality
npm run bible:ids         # List API.Bible IDs for your key
```

## Project structure

```
src/
├── app/
│   ├── api/bible/        # GET chapter text
│   ├── api/quiz/         # GET quiz questions (auth required)
│   ├── auth/callback/    # Magic link callback
│   ├── discuss/          # Chapter discussion
│   ├── read/             # Chapter reader
│   ├── quiz/             # Understanding check
│   └── ...
├── components/           # Auth, Navbar, etc.
├── lib/
│   ├── bible-server.ts   # API.Bible + helloao fetch
│   └── supabase/         # Client, server, admin helpers
├── store/                # Zustand + Supabase sync
supabase/migrations/      # Schema, RLS, RPC, Realtime
scripts/                  # Migrations, quiz generation, seeding
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

MIT — Copyright (c) 2026 Leni4c. See [LICENSE](LICENSE).

## Data sources & attribution

Len Bible does **not** ship Bible text. Scripture is fetched at runtime:

| Provider | Role |
|----------|------|
| [API.Bible](https://scripture.api.bible/) | Licensed translations when `API_BIBLE_KEY` is set |
| [helloao.org](https://bible.helloao.org/) | Free fallback (BSB, NET, ASV, etc.) |

Translation copyrights belong to their respective holders. Len Bible is not affiliated with any Bible publisher.
