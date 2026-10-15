// `pnpm tokens` (M1 plan, T19): builds packages/ui/src/styles/tokens.css and packages/ui/src/tokens.ts
// from the two token files with Style Dictionary (D26), after the checks of D27 and D35. Run with
// plain `node scripts/figma-tokens.ts`. Exit code 1, with the reason, if a check fails: nothing is
// written then.
import { writeFileSync } from "node:fs";
import { buildModelFrom, formatTokens, PATHS } from "./lib/tokens/build.ts";
import { formatRatio } from "./lib/tokens/contrast.ts";

try {
  const model = await buildModelFrom();
  const { css, ts } = await formatTokens();
  writeFileSync(PATHS.css, css);
  writeFileSync(PATHS.ts, ts);

  console.log(
    `tokens.css and tokens.ts written (${model.colors.length} colours, ${model.primitives.length} primitives).`,
  );
  console.log(`Contrast: ${model.pairs.length} pairs, all pass.`);
  const overridden = model.colors.filter((c) => c.override);
  console.log(`Overrides of the kit (D35): ${overridden.length}`);
  for (const c of overridden) {
    const o = c.override!;
    console.log(
      `  --${c.name}: kit ${o.kitValue}, ours ${c.value}${c.primitive ? ` (--${c.primitive})` : ""}`,
    );
    for (const p of model.pairs) {
      if (
        !p.kit ||
        ![p.foreground, p.background, p.over].some((s) => s?.name === c.name)
      )
        continue;
      const alpha = p.alpha === 1 ? "" : ` at ${Math.round(p.alpha * 100)} %`;
      console.log(
        `    ${p.id}${alpha}: kit ${formatRatio(p.kit.ratio, p.minimum)}:1, ours ${formatRatio(p.ratio, p.minimum)}:1 (needs ${p.minimum}:1)`,
      );
    }
  }
  console.log(
    `Kit tokens not mapped: ${model.counts.kit - model.counts.kitRead} of ${model.counts.kit}`,
  );
  for (const u of model.unmapped) console.log(`  ${u.group}: ${u.count}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
