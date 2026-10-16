#!/usr/bin/env bash
# THROWAWAY spike tooling (plan M1 §6, S4): one request, one line.
#
#   probe.sh <path> [label]      e.g. probe.sh /en-us/spike-product/b/some-handle O1-b
#
# Prints the label, the path, the HTTP status, the total time in seconds and what the body shows:
# the spike-variant marker, the product title, when the data was read (fetched-at), and whether it
# contains the market error state, Next's bare error page (`__next_error__`), React's client-render
# fallback (`$RX`), the not-found page's text (any language), and `noindex`. The body is saved in
# $S4_OUT/bodies/<label>.html (its headers beside it, as .headers), and the line is appended as JSON
# to $S4_OUT/probes.jsonl with an ISO timestamp. A label used twice overwrites the saved body.
set -euo pipefail

BASE_URL="${S4_BASE_URL:-http://localhost:8000}"
MAX_TIME_S="${S4_PROBE_MAX_TIME:-60}"
S4_OUT="${S4_OUT:-/tmp/claude-0/-home-user-shopblok-starter/2b2d169f-f052-59e3-8c3b-72a62fab0042/scratchpad/s4}"

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: probe.sh <path> [label]" >&2
  exit 2
fi

path="$1"
[[ "$path" == /* ]] || path="/$path"
label="${2:-$(printf '%s' "${path#/}" | tr -c 'A-Za-z0-9._-' '_')}"
label="$(printf '%s' "$label" | tr -c 'A-Za-z0-9._-' '_')"
[[ -n "$label" ]] || label="root"

mkdir -p "$S4_OUT/bodies"
body="$S4_OUT/bodies/$label.html"
headers="$S4_OUT/bodies/$label.headers"
curl_error="$(mktemp)"
trap 'rm -f "$curl_error"' EXIT
: >"$body"
: >"$headers"

# A failed request (refused, timed out) still gets a line: status 000.
rc=0
timing="$(curl -sS --max-time "$MAX_TIME_S" -D "$headers" -o "$body" \
  -w '%{http_code} %{time_total}' "$BASE_URL$path" 2>"$curl_error")" || rc=$?
status="${timing%% *}"
total="${timing##* }"
[[ "$status" =~ ^[0-9]+$ ]] || status=000
[[ "$total" =~ ^[0-9.]+$ ]] || total=0
error=""
if ((rc != 0)); then
  error="curl exit $rc: $(tr '\n' ' ' <"$curl_error" | sed 's/ *$//')"
fi

# The text of the first element with `data-testid="<id>"`.
marker() {
  { grep -aoP "data-testid=\"$1\"[^>]*>\K[^<]*" "$body" || true; } | head -n 1
}

yes_no() {
  if "$@"; then echo yes; else echo no; fi
}

contains() {
  grep -qaF -e "$1" "$body"
}

# `notFound.title` of the four catalogs in packages/i18n (en, el, de, fr).
contains_not_found_title() {
  grep -qaF \
    -e "Page not found" \
    -e "Η σελίδα δεν βρέθηκε" \
    -e "Seite nicht gefunden" \
    -e "Page introuvable" \
    "$body"
}

header() {
  { grep -iaP "^$1:" "$headers" || true; } | tail -n 1 | sed -E 's/^[^:]*:[[:space:]]*//; s/[[:space:]]+$//'
}

variant="$(marker spike-variant)"
title="$(marker product-title)"
fetched_at="$(marker fetched-at)"
error_state="$(yes_no contains 'data-testid="error-state"')"
next_error="$(yes_no contains '__next_error__')"
rx="$(yes_no contains '$RX')"
not_found="$(yes_no contains_not_found_title)"
noindex="$(yes_no contains 'noindex')"
html_lang="$({ grep -aoP '<html[^>]*\blang="\K[^"]*' "$body" || true; } | head -n 1)"
cache="$(header x-nextjs-cache)"
cache_control="$(header cache-control)"

printf '%s %s status=%s time=%ss variant=%s title="%s" fetched-at=%s error-state=%s next-error=%s rx=%s not-found=%s noindex=%s lang=%s x-nextjs-cache=%s%s\n' \
  "$label" "$path" "$status" "$total" "${variant:--}" "${title:--}" "${fetched_at:--}" \
  "$error_state" "$next_error" "$rx" "$not_found" "$noindex" "${html_lang:--}" "${cache:--}" \
  "${error:+ error=\"$error\"}"

truth() {
  [[ "$1" == yes ]] && echo true || echo false
}

jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
  --arg label "$label" \
  --arg path "$path" \
  --argjson status "$((10#$status))" \
  --argjson time "$total" \
  --arg variant "$variant" \
  --arg title "$title" \
  --arg fetchedAt "$fetched_at" \
  --argjson errorState "$(truth "$error_state")" \
  --argjson nextError "$(truth "$next_error")" \
  --argjson rx "$(truth "$rx")" \
  --argjson notFound "$(truth "$not_found")" \
  --argjson noindex "$(truth "$noindex")" \
  --arg lang "$html_lang" \
  --arg nextjsCache "$cache" \
  --arg cacheControl "$cache_control" \
  --arg error "$error" \
  --arg body "bodies/$label.html" \
  '{
    ts: $ts, label: $label, path: $path, status: $status, time: $time,
    variant: $variant, title: $title, fetchedAt: $fetchedAt,
    errorState: $errorState, nextError: $nextError, rx: $rx, notFound: $notFound,
    noindex: $noindex, lang: $lang, nextjsCache: $nextjsCache, cacheControl: $cacheControl,
    error: $error, body: $body
  }' >>"$S4_OUT/probes.jsonl"
