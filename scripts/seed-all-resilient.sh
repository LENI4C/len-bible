#!/usr/bin/env bash
# Restart deterministic quiz seeding until report shows completion or max rounds.
set -euo pipefail
cd "$(dirname "$0")/.."
LOG="${1:-/tmp/len-bible-seed-all.log}"
ROUNDS="${2:-40}"

for i in $(seq 1 "$ROUNDS"); do
  echo "[round $i] $(date -Iseconds) starting quizzes:seed-all" | tee -a "$LOG"
  set +e
  npm run quizzes:seed-all >>"$LOG" 2>&1
  code=$?
  set -e
  echo "[round $i] exit=$code" | tee -a "$LOG"
  # Stop early if last lines show Done with 0 inserted (fully caught up)
  if tail -5 "$LOG" | grep -q 'inserted, .* skipped' && tail -5 "$LOG" | grep -qE 'Done: 0 chapters inserted'; then
    echo "Caught up — exiting." | tee -a "$LOG"
    exit 0
  fi
  sleep 2
done
echo "Max rounds reached." | tee -a "$LOG"
exit 0
