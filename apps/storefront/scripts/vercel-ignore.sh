#!/bin/bash
# Vercel's "Ignored Build Step" for the storefront (M7 D135, T114; `vercel.json`'s ignoreCommand).
# Vercel runs it in apps/storefront before the install, and reads its exit code the other way
# round from a test: 1 builds the commit, 0 skips it.
#
# The commit is built when it changes the storefront or a workspace package it depends on, or
# `@shopblok/scripts` (the build runs `doctor` from there), as turbo's package graph says
# (`turbo query affected`, the lockfile and the root's files included), compared with the commit
# of the last deployment of this branch. Any doubt builds: no last deployment, a commit the clone
# does not have, or turbo failing. A Medusa-only or docs-only push builds nothing here.
set -uo pipefail

TURBO="turbo@2.11.7"
cd "$(git rev-parse --show-toplevel)" || exit 1

base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ]; then
  echo "vercel-ignore: no earlier deployment of this branch, so this one builds"
  exit 1
fi
# Vercel's clone is shallow: fetch the base commit when it is missing.
if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  git fetch --quiet --depth=1 origin "$base" 2>/dev/null || true
fi
if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "vercel-ignore: the last deployment's commit is not in the clone, so this one builds"
  exit 1
fi

npx --yes "$TURBO" query affected --packages @shopblok/storefront @shopblok/scripts \
  --base "$base" --head HEAD --exit-code >/dev/null
code=$?
case "$code" in
  0)
    echo "vercel-ignore: nothing the storefront builds from changed since ${base:0:7}; skipped"
    exit 0
    ;;
  1)
    echo "vercel-ignore: the storefront or a package it uses changed since ${base:0:7}; building"
    exit 1
    ;;
  *)
    echo "vercel-ignore: turbo could not tell (exit $code), so this one builds"
    exit 1
    ;;
esac
