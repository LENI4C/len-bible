#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
CLI="${CLI:-./.bin/supabase}"
if [[ ! -x "$CLI" ]]; then
  CLI="$(command -v supabase || true)"
fi
if [[ -z "${CLI}" ]]; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source <(grep -E '^(SUPABASE_|DATABASE_|NEXT_PUBLIC_SUPABASE_)' .env.local | sed 's/\r$//')
set +a

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN in .env.local"
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD in .env.local"
  exit 1
fi

REF="${SUPABASE_PROJECT_REF:-sfirdpqmlchvjexpffag}"
echo "Linking $REF…"
# Pass password via env / stdin-friendly flags — avoid embedding secrets in argv when possible.
# CLI still accepts -p; we use it only from env var (not interpolated into a shell string).
"$CLI" link --project-ref "$REF" --password "$SUPABASE_DB_PASSWORD"
echo "Pushing migrations…"
"$CLI" db push --linked --include-all --yes
echo "Done. If push fails with 'already exists', repair history then retry:"
echo "  ./.bin/supabase migration repair --linked --status applied <version…> --yes"
echo "  npm run db:push"
