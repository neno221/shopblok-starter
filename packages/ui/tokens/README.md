# Design tokens

| File | Written by | What it is |
|---|---|---|
| `figma.tokens.json` | the export only (M1 plan, T18; D24, D25) | Every local variable collection of the Figma kit, in every mode, and the kit's local text and effect styles. A normalised copy of Figma's own model: aliases as `{ "alias": "collection/name" }` (with `"remote": true` for another library's variable, and `"unlisted": true` for one its collection no longer lists, which isn't in the file), colours as `#rrggbb` or `#rrggbbaa`, keys sorted and lists sorted by name, no ids and no dates |
| `shopblok.tokens.json` | hand (T19; D27) | The two greys of our own, `semantic` (every CSS colour variable as a reference to the kit or to a palette colour, with the kit's value named where an override replaces it, D35), SPEC §9.2's commerce tokens, the contrast pairs, and what the kit lacks (design widths, z-index, containers, motion) |
| `../src/styles/tokens.css` | `pnpm tokens` (T19; D26) | The CSS both files build to: `:root` and `@theme inline`, light only |
| `../src/tokens.ts` | `pnpm tokens` (T19) | The same facts as data for the design-system pages: names, values, sources, the kit's value where overridden, and every pair's ratio |

**Never edit `figma.tokens.json` by hand.** A change to the kit is made in Figma and exported again; a departure from the kit goes in `shopblok.tokens.json`. Re-exporting an unchanged kit gives an empty `git diff`.

**Never edit `tokens.css` or `tokens.ts` by hand either.** Run `pnpm tokens` after a change to either token file. The build checks the pairs of `shopblok.tokens.json` (4.5:1 for text, 3:1 for UI components), the radius scale and the 4 px spacing step before it writes anything (every `*-foreground` and `*-ring` token must be in a pair, or listed with a reason in `COVERAGE_EXEMPT` in `scripts/lib/tokens/checks.ts`; and `fonts.ts` must set the font variable `tokens.css` reads), and `pnpm test` fails if the committed files differ from the build (`scripts/lib/tokens/committed.test.ts`). To change an override, edit its token under `semantic` in `shopblok.tokens.json`; the failure message names the pair and the ratio.

## Exporting again

The export runs the read-only plugin code in [`scripts/figma/export-variables.js`](../../../scripts/figma/export-variables.js) through the Figma connector's `use_figma` tool. The connector's answer is limited to 20 480 bytes, so the code returns one slice of the export per run, and [`scripts/figma/assemble.ts`](../../../scripts/figma/assemble.ts) joins the slices and checks their length and hash before it writes this file. A session with the Figma connector signed in (Steph's team) can do it with this prompt:

> Export the Figma kit's variables again (M1 plan, T18). Load the `/figma-use` skill, then run `scripts/figma/export-variables.js` with `use_figma` on file `1PUSIlNviAwiZT0praTxES`, exactly as committed except for `PAGE`, for PAGE = 0, 1, 2 … until a slice's `offset + chunk.length` equals its `length`. Run three slices at a time and pause a minute between batches. Save each result object as a JSON file in one folder, run `node scripts/figma/assemble.ts <folder>`, and show me `git diff --stat packages/ui/tokens/figma.tokens.json`. Send the file nothing but reads.

The connector allows about ten calls a minute. When it refuses a call, it says "truncated to 20kb" whatever the call's size, so wait a minute and try again rather than lowering `PAGE_SIZE`.

Without the connector, the plan's T18 fallback applies: the same code runs as a development plugin in the Figma desktop app.
