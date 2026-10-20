/**
 * List Bible translations available for your API.Bible key.
 * Usage: npm run bible:ids
 * Requires API_BIBLE_KEY in .env.local
 */
import "dotenv/config";

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

async function main() {
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    console.error("Set API_BIBLE_KEY in .env.local first.");
    process.exit(1);
  }

  const res = await fetch(`${API_BIBLE_BASE}/bibles?language=eng`, {
    headers: { "api-key": apiKey },
  });

  if (!res.ok) {
    console.error(`API.Bible error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const body = (await res.json()) as {
    data?: { id: string; name: string; abbreviation?: string }[];
  };

  const rows = body.data ?? [];
  console.log(`\n${rows.length} English Bibles on your account:\n`);
  for (const b of rows) {
    console.log(`${(b.abbreviation ?? "?").padEnd(8)} ${b.id.padEnd(28)} ${b.name}`);
  }

  console.log(
    "\nCopy the id into src/lib/bible-versions.ts apiBibleId for each version you license."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
