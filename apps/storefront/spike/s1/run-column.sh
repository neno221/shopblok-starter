#!/bin/bash
# One column of S1's matrix: run-column.sh <dev|start> <on|off> <no|yes>
#   mode:  next dev, or next build && next start
#   on|off: partialPrefetching
#   no|yes: the W1 edit of the generated admin page (spike/s1/w1.patch)
# Needs S1_OUT, a folder for the logs. Leaves nothing running.
set -uo pipefail
MODE=$1; PP=$2; W1=$3
cd "$(dirname "$0")/../.."
# Optional: S1_W3=yes (all three generated admin files, spike/s1/w3.patch; not with W1/W2),
# S1_W2=yes (also patch the admin's root layout, spike/s1/w2.patch), S1_CC=off (Cache
# Components off: a dev baseline for what Payload logs by itself), S1_GREP (a Playwright --grep).
W2=${S1_W2:-no}; W3=${S1_W3:-no}; CC=${S1_CC:-on}
SUFFIX=""; [ "${S1_INSIGHTS:-}" = manual ] && SUFFIX="-manual"; [ "$W2" = yes ] && SUFFIX="$SUFFIX-w2"; [ "$W3" = yes ] && SUFFIX="$SUFFIX-w3"; [ "$CC" = off ] && SUFFIX="$SUFFIX-ccoff"
OUT="${S1_OUT:?set S1_OUT}/${MODE}-pp${PP}-w1${W1}${SUFFIX}"
mkdir -p "$OUT"
PAGE='src/app/(payload)/admin/[[...segments]]/page.tsx'
LAYOUT='src/app/(payload)/layout.tsx'
NOTFOUND='src/app/(payload)/admin/[[...segments]]/not-found.tsx'

spike/s1/stop-server.sh
git checkout -q -- "$PAGE" "$LAYOUT" "$NOTFOUND"
[ "$W1" = yes ] && git apply spike/s1/w1.patch
[ "$W2" = yes ] && git apply spike/s1/w2.patch
[ "$W3" = yes ] && git apply spike/s1/w3.patch
# Cache Components off: `use cache` cannot compile, so the not-found page that imports one is set
# aside for the run (git restores it at the end).
GNF='src/app/global-not-found.tsx'
trap 'git checkout -q -- "$GNF" "$PAGE" "$LAYOUT" "$NOTFOUND"' EXIT
[ "$CC" = off ] && mv "$GNF" "$OUT/global-not-found.tsx.set-aside"
export S1_PARTIAL_PREFETCHING=$PP S1_CC=$CC S1_INSIGHTS=${S1_INSIGHTS:-}
fresh=$(spike/s1/fresh-db.sh 2> "$OUT/fresh-db.log") || { echo "fresh-db failed: $OUT/fresh-db.log"; exit 3; }
eval "$fresh"
# Never run a column against any other database (the bootstrapped one has a user in it).
case "${PAYLOAD_DATABASE_URL:-}" in */payload_s1) ;; *) echo "PAYLOAD_DATABASE_URL is not payload_s1"; exit 3 ;; esac
rm -rf .next test-results

if [ "$MODE" = start ]; then
  start=$(date +%s)
  pnpm exec next build > "$OUT/build.log" 2>&1
  echo "$? $(( $(date +%s) - start ))s" > "$OUT/build.exit"
  [ "$(cut -d' ' -f1 "$OUT/build.exit")" = 0 ] || { echo "build failed: $OUT/build.log"; exit 2; }
  (setsid nohup pnpm exec next start -p 8000 > "$OUT/server.log" 2>&1 &)
else
  (setsid nohup pnpm exec next dev -p 8000 > "$OUT/server.log" 2>&1 &)
fi

for _ in $(seq 120); do
  curl -fs -o /dev/null localhost:8000/api/users/init && break
  sleep 1
done
if [ "$MODE" = dev ]; then
  # Compile every route the suite uses before the first test, so a slow first compile is not a failure.
  paths="/admin /admin/login /admin/create-first-user"
  # With Cache Components off the storefront's `use cache` code cannot compile, and a request to it
  # would poison the rest of the dev run: warm the admin only.
  [ "$CC" = off ] || paths="$paths /spike-cache /spike-cache/draft /next/spike/counter /us/spike-cache"
  for path in $paths; do
    curl -s -o /dev/null -m 120 "localhost:8000$path"
  done
fi

S1_REPORT="$OUT/report.json" pnpm exec playwright test -c playwright.s1.config.ts ${S1_GREP:+-g "$S1_GREP"} ${S1_GREP_INVERT:+--grep-invert "$S1_GREP_INVERT"} > "$OUT/suite.log" 2>&1
echo "suite exit $?" >> "$OUT/build.exit"
cp -r test-results "$OUT/test-results" 2>/dev/null
curl -s localhost:8000/next/spike/counter > "$OUT/counter.json"
spike/s1/stop-server.sh
git checkout -q -- "$PAGE" "$LAYOUT" "$NOTFOUND"
echo "done: $OUT"
