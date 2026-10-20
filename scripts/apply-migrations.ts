/**
 * Apply supabase/migrations/*.sql in order via direct Postgres connection.
 *
 * Requires in .env.local (Database → Connection string → URI in Supabase dashboard):
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Or:
 *   SUPABASE_DB_PASSWORD=your_database_password
 *   NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
 *
 * Run: npx tsx scripts/apply-migrations.ts
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import pg from "pg";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ref = baseUrl.replace("https://", "").replace(".supabase.co", "").split(".")[0];

  if (password && ref) {
    const region = process.env.SUPABASE_DB_REGION ?? "us-east-1";
    return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  }

  throw new Error(
    "Set DATABASE_URL or SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL) in .env.local.\n" +
      "Find it in Supabase → Project Settings → Database → Connection string (URI)."
  );
}

async function main() {
  const dir = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(`Applying ${files.length} migrations…`);

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`  → ${file}`);
    try {
      await client.query(sql);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`    (skipped — already applied)`);
        continue;
      }
      throw e;
    }
  }

  await client.end();
  console.log("\n✓ Migrations applied.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
