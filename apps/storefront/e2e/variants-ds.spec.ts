import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { entries } from "@shopblok/registry";
import { VARIANTS } from "@shopblok/registry/contracts";
import { catalogs } from "./support/catalogs";

// T91 (SPEC §17.1, M5's done-when; M5 plan §5 T91 step 1): every variant is on the DS page. For
// every family in `VARIANTS` (the values its Payload picker stores, D99), each value is a registry
// entry of that family whose DS page answers in the four languages and whose thumbnail (the
// picker's picture, D52) is in `public/registry/` and served. The drift test
// (`src/payload/blocks/drift.test.tsx`) checks the rest: the pickers' options, the stories, the
// baselines and each member's `data-variant`. In the `design-system` project, against the build
// with DESIGN_SYSTEM_ENABLED=true that the `design-system` job starts (`e2e-smoke`'s has no DS);
// `variants.spec.ts` is the shop's half, in `e2e-smoke`.

const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8000";
/** The four languages of the DS page (`@shopblok/i18n`'s, through the specs' catalogs). */
const LOCALES = Object.keys(catalogs);
const PUBLIC = path.join(import.meta.dirname, "..", "public");

const families = Object.entries(VARIANTS) as [string, readonly string[]][];

// A family is one test: the product card's ten members are forty pages (prerendered in the DS build).
test.setTimeout(90_000);

test("every family's members are in four languages on the DS page", () => {
  expect(LOCALES).toEqual(["en", "el", "de", "fr"]);
  // 114 members at M5's end: the headers, footers and cards (21), the blocks (60) and the
  // commerce templates and organisms (33).
  expect(families.flatMap(([, values]) => values).length).toBeGreaterThanOrEqual(114);
});

for (const [family, values] of families)
  test(`${family}: each member's DS page in four languages, and its thumbnail`, async () => {
    const problems: string[] = [];
    for (const value of values) {
      const entry = entries.find((each) => each.family === family && each.variant === value);
      if (entry === undefined) {
        problems.push(`${family} · ${value}: no registry entry`);
        continue;
      }
      await Promise.all(
        LOCALES.map(async (locale) => {
          const url = `/design-system/${locale}/${entry.id}`;
          const response = await fetch(`${base}${url}`, { signal: AbortSignal.timeout(30_000) });
          await response.arrayBuffer();
          if (response.status !== 200) problems.push(`${url} answers ${response.status}`);
        }),
      );
      // An update of the pictures writes a new member's thumbnail in this run: it is checked once
      // the update has committed it (the drift test names a missing one meanwhile).
      if (test.info().config.updateSnapshots !== "none") continue;
      const thumbnail = entry.thumbnail ?? "";
      if (thumbnail === "" || !existsSync(path.join(PUBLIC, thumbnail)))
        problems.push(`${entry.id}: no thumbnail in public${thumbnail || "/registry/"}`);
      else {
        const response = await fetch(`${base}${thumbnail}`);
        const type = response.headers.get("content-type") ?? "";
        await response.arrayBuffer();
        if (response.status !== 200 || type !== "image/png")
          problems.push(`${thumbnail} answers ${response.status} (${type})`);
      }
    }
    expect(problems).toEqual([]);
  });
