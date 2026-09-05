#!/usr/bin/env bash
# Run the Wikipedia importer for every cuisine in CUISINE_CATEGORIES.
# Publishes everything on the way (--publish). Sequential to be gentle
# on Wikipedia's rate limits (~1 req/s per client is polite).
#
# Env (both required):
#   SUPABASE_URL              e.g. http://127.0.0.1:54321
#   SUPABASE_SECRET_KEY       sb_secret_*
#
# Optional:
#   IMPORT_DEPTH              category recursion depth (default 1)
#   IMPORT_LIMIT              max dishes per cuisine (default 200)
#   ONLY                      space-separated list of cuisines to run
#
# Run:
#   SUPABASE_URL=http://127.0.0.1:54321 \
#   SUPABASE_SECRET_KEY=sb_secret_YOUR-KEY-FROM-supabase-status \
#   ./scripts/import-all-cuisines.sh

set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY is required}"
DEPTH="${IMPORT_DEPTH:-1}"
LIMIT="${IMPORT_LIMIT:-200}"

DEFAULT_CUISINES=(
  afghan
  iranian
  turkish
  pakistani
  indian
  bangladeshi
  central-asian
  arab
  italian
  french
  spanish
  austrian
  german
  greek
  british
  chinese
  japanese
  korean
  thai
  vietnamese
  mexican
  brazilian
  north-african
  west-african
  east-african
  american
  portuguese
  indo-chinese
)

if [[ -n "${ONLY:-}" ]]; then
  read -r -a CUISINES <<< "$ONLY"
else
  CUISINES=("${DEFAULT_CUISINES[@]}")
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for c in "${CUISINES[@]}"; do
  echo
  echo "════════ $c ════════"
  node "$SCRIPT_DIR/import-wikipedia-dishes.mjs" \
    --cuisine "$c" --publish --depth "$DEPTH" --limit "$LIMIT" \
    || echo "  (⚠ $c had errors; continuing)"
  # Polite pause between cuisines
  sleep 1
done

echo
echo "All done."
