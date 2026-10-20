# Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local` and fill in URL + keys
3. Apply migrations (pick one):

**Option A — script (needs database password in `.env.local`):**
```bash
# Add DATABASE_URL or SUPABASE_DB_PASSWORD to .env.local (see .env.example)
npx tsx scripts/apply-migrations.ts
npx tsx scripts/seed-sample-quizzes.ts   # Genesis 1-3 + Exodus 14 (no Anthropic key)
```

**Option B — Supabase SQL Editor (no DB password needed):**  
1. Open **SQL** in the left sidebar → **New query**  
2. Paste the contents of `supabase/combined_migration.sql` → **Run**  
3. Then locally: `npm run db:seed`

**Where is the database password now?** It is no longer under Project Settings for many accounts:
- Top bar → **Connect** → copy URI (replace `[YOUR-PASSWORD]`)
- Or left sidebar → **Database** → **Settings** → reset/view password  
  Direct link pattern: `https://supabase.com/dashboard/project/<ref>/database/settings`

**Option C — Supabase CLI:**
```bash
npx supabase link --project-ref YOUR_PROJECT_REF -p YOUR_DB_PASSWORD
npx supabase db push
```

4. Enable **Email auth** (magic link) in Authentication → Providers
5. Add redirect URL: `http://localhost:3000/auth/callback` (and your production URL)

## Excellence migrations (loop + badges)

After the base migrations, ensure these are applied (included when you run `npm run db:migrate`):

- `20261020180000_quiz_integrity_and_loop.sql` — client quiz view without answers; streak on quiz pass
- `20261020180100_retention_badges_rank.sql` — badges, streak freeze, `get_my_rank`

If you used the SQL Editor earlier, paste those two files there as well (or re-run `npm run db:migrate`).

## Generate / seed quizzes

```bash
npm run db:seed              # Genesis 1–3 + Exodus 14 sample JSON (no Anthropic)
npm run quizzes:seed-all     # deterministic generator for all chapters (no Anthropic)
npm run quizzes:generate     # higher-quality LLM quizzes (needs ANTHROPIC_API_KEY)
npm run quizzes:audit        # structural audit of stored questions
```

Missing chapters also auto-seed on first quiz fetch via `ensureQuizQuestions`.
`quizzes:generate` / `quizzes:seed-all` require `SUPABASE_SERVICE_ROLE_KEY`.
