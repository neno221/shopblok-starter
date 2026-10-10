#!/bin/bash
# M3: the published read bypasses the cache (and streams behind connection()), so every request
# runs the loader. The cache-hit test has to notice. Needs S1_OUT. Restores the files afterwards.
cd "$(dirname "$0")/../.."
S=src/lib/spike/s1.ts; P='src/app/(storefront)/[market]/spike-cache/page.tsx'
BAK=$(mktemp -d); cp "$S" "$BAK/s1.ts"; cp "$P" "$BAK/page.tsx"
trap 'cp "$BAK/s1.ts" "$S"; cp "$BAK/page.tsx" "$P"' EXIT
python3 - <<'PY'
p="src/lib/spike/s1.ts"; s=open(p).read()
s=s.replace("    read = cached(\n      async (language: string): Promise<PagesRead> => {\n        const payload = await getPayloadClient();\n        const runId = bump(`published:","    read = ((load: (language: string) => Promise<PagesRead>, _options: unknown) => load)(\n      async (language: string): Promise<PagesRead> => {\n        const payload = await getPayloadClient();\n        const runId = bump(`published:",1)
open(p,"w").write(s)
p="src/app/(storefront)/[market]/spike-cache/page.tsx"
open(p,"w").write('''import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentMarket } from "../../../../lib/current-market";
import { readPublished } from "../../../../lib/spike/s1";

export default async function SpikeCache() {
  const market = await getCurrentMarket();
  return (
    <Suspense fallback={<p>…</p>}>
      <Inner language={market.language} />
    </Suspense>
  );
}

async function Inner({ language }: { language: string }) {
  await connection();
  const read = await readPublished(language);
  return (
    <main className="p-8">
      <p data-testid="s1-run">{read.runId}</p>
      <ul data-testid="s1-titles">
        {read.titles.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
    </main>
  );
}
''')
PY
grep -c '_options: unknown' "$S"
S1_OUT="$S1_OUT/m3-uncached" spike/s1/run-column.sh start on no
