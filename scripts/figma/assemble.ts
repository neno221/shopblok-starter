// Joins the slices that scripts/figma/export-variables.js returns into
// packages/ui/tokens/figma.tokens.json (M1 plan, T18; D25).
//
//   node scripts/figma/assemble.ts <slices-dir> [out-file]
//
// <slices-dir> holds one JSON file per `use_figma` result, each the object the export code
// returned ({ offset, length, fnv1a, chunk, … }). lib/figma-slices.ts checks that they cover the
// text and match its length and hash. The file is written with two-space indentation and a final
// newline; the default out-file is found from this file, not from the current directory.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { joinSlices, type Slice } from "../lib/figma-slices.ts";

type Tokens = {
  collections: { variables: unknown[] }[];
  styles: { text: unknown[]; effect: unknown[] };
};

const [
  dir,
  outFile = path.join(
    import.meta.dirname,
    "../../packages/ui/tokens/figma.tokens.json",
  ),
] = process.argv.slice(2);
if (!dir) {
  console.error(
    "usage: node scripts/figma/assemble.ts <slices-dir> [out-file]",
  );
  process.exit(2);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`${dir} has no .json slices`);
  process.exit(1);
}
const slices = files.map(
  (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Slice,
);
const tokens = JSON.parse(joinSlices(slices)) as Tokens;
writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
const count = tokens.collections.reduce((n, c) => n + c.variables.length, 0);
console.log(
  `${path.relative(process.cwd(), outFile)}: ${tokens.collections.length} collections, ${count} variables, ` +
    `${tokens.styles.text.length} text styles, ${tokens.styles.effect.length} effect styles`,
);
