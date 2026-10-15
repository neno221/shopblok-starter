// Joins the slices that scripts/figma/export-variables.js returns into
// packages/ui/tokens/figma.tokens.json (M1 plan, T18; D25).
//
//   node scripts/figma/assemble.mjs <slices-dir> [out-file]
//
// <slices-dir> holds one JSON file per `use_figma` result, each the object the
// export code returned ({ offset, length, fnv1a, chunk, … }). The slices may
// come from runs with different PAGE_SIZE values; they must cover the text
// without gaps. The joined text must have the reported length and FNV-1a hash,
// so a slice copied wrongly fails here instead of reaching the repo. The file
// is written with two-space indentation and a final newline.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, outFile = "packages/ui/tokens/figma.tokens.json"] =
  process.argv.slice(2);
if (!dir) {
  console.error(
    "usage: node scripts/figma/assemble.mjs <slices-dir> [out-file]",
  );
  process.exit(2);
}

const slices = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
  .sort((a, b) => a.offset - b.offset);

const { length, fnv1a } = slices[0];
let text = "";
for (const s of slices) {
  if (s.length !== length || s.fnv1a !== fnv1a) {
    throw new Error(
      `slice at ${s.offset} comes from a different export (${s.fnv1a})`,
    );
  }
  if (s.offset > text.length) throw new Error(`gap before offset ${s.offset}`);
  text =
    text.slice(0, s.offset) + s.chunk + text.slice(s.offset + s.chunk.length);
}
if (text.length !== length)
  throw new Error(`joined ${text.length} of ${length} characters`);

let hash = 0x811c9dc5;
for (let i = 0; i < text.length; i++) {
  hash ^= text.charCodeAt(i);
  hash = Math.imul(hash, 0x01000193) >>> 0;
}
if (hash.toString(16).padStart(8, "0") !== fnv1a)
  throw new Error("FNV-1a hash differs");

const tokens = JSON.parse(text);
const count = tokens.collections.reduce((n, c) => n + c.variables.length, 0);
writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
console.log(
  `${outFile}: ${tokens.collections.length} collections, ${count} variables, ` +
    `${tokens.styles.text.length} text styles, ${tokens.styles.effect.length} effect styles`,
);
