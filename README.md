# Len Bible 📜

A gamified Bible web app — chronological reading, real chapter quizzes, streaks, and leaderboards.

## Quick start

```bash
npm install
npm run dev:clean    # clears cache + starts dev server
```

Open **http://localhost:3000**

You should see the **Welcome to Len Bible** onboarding screen. Pick a username to begin.

## If the page is blank or stuck loading

1. Stop any old servers: `pkill -f "next dev"`
2. Clear the build cache: `rm -rf .next`
3. Restart: `npm run dev:clean`

## Features

- **Chronological reading** — 66 books in event order (Genesis → Revelation)
- **Real Bible text** — fetched live from helloao.org API
- **Real quizzes** — generated from actual chapter verses (every chapter)
- **Auto chapter completion** — scroll to 88% + minimum read time
- **6 Bible versions** — each mapped to a real open translation
- **Book overviews** — NIV-style summaries before every book
- **Streaks, points, levels, leaderboard** — all from real user activity

## Optional: licensed translations

Add to `.env.local`:
```
API_BIBLE_KEY=your_key_from_scripture.api.bible
```

Without a key, the app uses real open-source translations (BSB, NET, ASV, etc.) and shows which source is being used.

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Framer Motion
