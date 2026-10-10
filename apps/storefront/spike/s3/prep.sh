#!/bin/bash
# S3 PROTOTYPE. A benchmark database: fresh, migrated, seeded (S3_DOCS documents in four languages),
# with an admin and `markets` enabling en, el, de and fr.   prep.sh <suffix> [four]
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE/../.."
suffix=$1; mode=${2:-full}
node spike/s3/fresh.ts "$suffix" $([ "$mode" = four ] && echo four)
S3_DOCS=${S3_DOCS:-50} node spike/s3/run-payload.ts "$suffix" spike/s3/seed.ts $([ "$mode" = four ] && echo four) 2>&1 | grep -E '"seed"|exit'
S3_MEMO=ttl "$HERE/server.sh" start "$suffix" $([ "$mode" = four ] && echo four)
node spike/s3/setup-admin.mjs
"$HERE/server.sh" stop
