#!/bin/bash
# Proves the suite can fail: three mutations of the prototype, each run in `next start`, and the
# test that has to notice it. Needs S1_OUT. Restores the files afterwards.
cd "$(dirname "$0")/../.."
S=src/lib/spike/s1.ts; H=src/payload/hooks/revalidate-pages.ts
BAK=$(mktemp -d)
cp "$S" "$BAK/s1.ts"; cp "$H" "$BAK/hook.ts"
restore() { cp "$BAK/s1.ts" "$S"; cp "$BAK/hook.ts" "$H"; }
trap restore EXIT

run() { # name, then the sed expressions are applied by the caller before
  S1_OUT="$S1_OUT/$1" spike/s1/run-column.sh start on no
  restore
}

echo "== M1: the preview read always asks for drafts, so the public path leaks"
python3 - <<'PY'
p="src/lib/spike/s1.ts"; s=open(p).read()
s=s.replace("draft: isEnabled,\n          overrideAccess: isEnabled,","draft: true,\n          overrideAccess: true,")
open(p,"w").write(s)
PY
grep -c 'draft: true' "$S"; run m1-draft-leak

echo "== M2: the pages hook revalidates nothing"
python3 - <<'PY'
p="src/payload/hooks/revalidate-pages.ts"; s=open(p).read()
s=s.replace('    revalidateTag(`pages:${locale}`, "max");\n    revalidateTag("payload:pages", "max");\n','')
open(p,"w").write(s)
PY
grep -c 'revalidateTag(' "$H"; run m2-no-revalidation

echo "== M3: the published read is not cacheable (life 0)"
python3 - <<'PY'
p="src/lib/spike/s1.ts"; s=open(p).read()
s=s.replace('name: `s1:published:${locale}`,\n        tags: [`pages:${locale}`, "payload:pages"],\n        life: { stale: 300, revalidate: 3600, expire: 86_400 },','name: `s1:published:${locale}`,\n        tags: [`pages:${locale}`, "payload:pages"],\n        life: { stale: 0, revalidate: 0, expire: 0 },')
open(p,"w").write(s)
PY
grep -c 'expire: 0 }' "$S"; run m3-uncached
echo "mutations done"
