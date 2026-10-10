// S3 PROTOTYPE. L9, Local API half: startup cost and the cost of reading and writing a document that
// is filled in four languages, in one process against one database.
//   NODE_ENV=production S3_RICH=1 [S3_LOCALES=four] PAYLOAD_DATABASE_URL=… payload run spike/s3/bench-local.ts
import { getPayload } from "payload";
import { SEED_LOCALES, richData } from "./content.ts";

const t0 = performance.now();
const { default: config } = await import("@payload-config");
const built = await config;
const t1 = performance.now();
const payload = await getPayload({ config: built });
const t2 = performance.now();

const collection = "s3-rich" as never;
const first = await payload.find({ collection, limit: 1, sort: "id", depth: 0, locale: "en" });
const id = (first.docs[0] as unknown as { id: number }).id;

const stats = (ms: number[]) => {
  const sorted = [...ms].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] as number;
  return { n: ms.length, p50: +at(0.5).toFixed(3), p95: +at(0.95).toFixed(3), mean: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(3) };
};
async function time(n: number, warm: number, run: (i: number) => Promise<unknown>) {
  for (let i = 0; i < warm; i++) await run(i);
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = performance.now();
    await run(i);
    samples.push(performance.now() - s);
  }
  return stats(samples);
}

const result: Record<string, unknown> = {
  locales: payload.config.localization ? payload.config.localization.localeCodes.length : 0,
  configMs: +(t1 - t0).toFixed(1),
  initMs: +(t2 - t1).toFixed(1),
};
const N = Number(process.env["S3_N"] ?? 100);

// 100 findByID in each of the four languages, and pooled
const pooled: number[] = [];
for (const locale of SEED_LOCALES) {
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) await payload.findByID({ collection, id, locale, depth: 0 });
  for (let i = 0; i < N; i++) {
    const s = performance.now();
    await payload.findByID({ collection, id, locale, depth: 0 });
    samples.push(performance.now() - s);
  }
  result[`findByID ${locale}`] = stats(samples);
  pooled.push(...samples);
}
result["findByID pooled"] = stats(pooled);
result["findByID locale=all"] = await time(N, 20, () => payload.findByID({ collection, id, locale: "all", depth: 0 }));
result["findByID el, depth 1"] = await time(N, 20, () => payload.findByID({ collection, id, locale: "el", depth: 1 }));
result["find limit 50, el"] = await time(Math.max(20, N / 4), 5, () => payload.find({ collection, limit: 50, locale: "el", depth: 0 }));
result["find where title like, el"] = await time(Math.max(20, N / 4), 5, () =>
  payload.find({ collection, where: { title: { like: "el 1" } }, limit: 20, locale: "el", depth: 0 }),
);
result["update one field, el"] = await time(Math.max(20, N / 2), 5, (i) =>
  payload.update({ collection, id, locale: "el", data: { text01: `bench ${i}` } as never }),
);
result["versions of the document"] = await time(Math.max(20, N / 4), 5, () =>
  payload.findVersions({ collection, where: { parent: { equals: id } }, limit: 10, depth: 0 }),
);
// restore the field so a later run starts from the same data
await payload.update({ collection, id, locale: "el", data: { text01: (richData("el", 1) as { text01: string }).text01 } as never });

console.log(JSON.stringify({ benchLocal: result }));
process.exit(0);
