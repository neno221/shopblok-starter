# Design tokens

| File | Written by | What it is |
|---|---|---|
| `figma.tokens.json` | the export only (M1 plan, T18; D24, D25) | Every local variable collection of the Figma kit, in every mode, and the kit's local text and effect styles. A normalised copy of Figma's own model: aliases as `{ "alias": "collection/name" }` (with `"remote": true` for another library's variable, and `"unlisted": true` for one its collection no longer lists, which isn't in the file), colours as `#rrggbb` or `#rrggbbaa`, keys sorted and lists sorted by name, no ids and no dates |
| `shopblok.tokens.json` | hand (T19; D27) | SPEC §9.2's commerce tokens, the contrast pairs and their AA overrides (D35), and what the kit lacks |
| `../src/styles/tokens.css` | `pnpm tokens` (T19; D26) | The CSS both files build to |

**Never edit `figma.tokens.json` by hand.** A change to the kit is made in Figma and exported again; a departure from the kit goes in `shopblok.tokens.json`. Re-exporting an unchanged kit gives an empty `git diff`.

## Exporting again

The export runs the read-only plugin code in [`scripts/figma/export-variables.js`](../../../scripts/figma/export-variables.js) through the Figma connector's `use_figma` tool. The connector's answer is limited to 20 480 bytes, so the code returns one slice of the export per run, and [`scripts/figma/assemble.ts`](../../../scripts/figma/assemble.ts) joins the slices and checks their length and hash before it writes this file. A session with the Figma connector signed in (Steph's team) can do it with this prompt:

> Export the Figma kit's variables again (M1 plan, T18). Load the `/figma-use` skill, then run `scripts/figma/export-variables.js` with `use_figma` on file `1PUSIlNviAwiZT0praTxES`, exactly as committed except for `PAGE`, for PAGE = 0, 1, 2 … until a slice's `offset + chunk.length` equals its `length`. Run three slices at a time and pause a minute between batches. Save each result object as a JSON file in one folder, run `node scripts/figma/assemble.ts <folder>`, and show me `git diff --stat packages/ui/tokens/figma.tokens.json`. Send the file nothing but reads.

The connector allows about ten calls a minute. When it refuses a call, it says "truncated to 20kb" whatever the call's size, so wait a minute and try again rather than lowering `PAGE_SIZE`.

Without the connector, the plan's T18 fallback applies: the same code runs as a development plugin in the Figma desktop app.
