// S3 PROTOTYPE. Reads the files l9.sh wrote and prints, for each measure, the median over rounds of
// the p50 for full (42), four (4) and full2 (42, the control), and the ratios.  node l9-summary.mjs <dir>
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const rows = {}; // measure -> config -> [p50 per round]
const add = (measure, cfg, v) => ((rows[measure] ??= {})[cfg] ??= []).push(v);
for (const f of files) {
  const [, cfg, kind] = /^r\d+-(\w+)-(\w+)\.json$/.exec(f) ?? [];
  if (!cfg) continue;
  const text = readFileSync(path.join(dir, f), "utf8").trim();
  if (!text) continue;
  const j = JSON.parse(text);
  if (j.benchLocal) {
    for (const [k, v] of Object.entries(j.benchLocal)) if (v && typeof v === "object" && "p50" in v) add(`local: ${k}`, cfg, v.p50);
    add("local: config import ms", cfg, j.benchLocal.configMs);
    add("local: getPayload init ms", cfg, j.benchLocal.initMs);
  } else if (j.benchHttp) {
    for (const [k, v] of Object.entries(j.benchHttp)) add(`http: ${k}`, cfg, v.p50);
  } else if (j.benchBrowser) add("browser: edit view goto to last field (ms)", cfg, j.benchBrowser.p50);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const out = [];
for (const [measure, byCfg] of Object.entries(rows)) {
  const m = Object.fromEntries(Object.entries(byCfg).map(([c, v]) => [c, median(v)]));
  const perRound = byCfg.full && byCfg.four ? byCfg.full.map((v, i) => +(v / byCfg.four[i]).toFixed(3)) : [];
  out.push({
    measure,
    "42 (full)": +m.full?.toFixed(2),
    "4 (four)": +m.four?.toFixed(2),
    "42 (full2, control)": +m.full2?.toFixed(2),
    "full/four": +(m.full / m.four).toFixed(3),
    "full2/four": +(m.full2 / m.four).toFixed(3),
    "full/full2": +(m.full / m.full2).toFixed(3),
    "worst round full/four": Math.max(...perRound),
  });
}
console.table(out);
