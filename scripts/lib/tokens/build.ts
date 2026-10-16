// The Style Dictionary set-up (M1 plan, D26, T19). `scripts/figma-tokens.ts` writes what this
// returns and `committed.test.ts` compares it with the committed files, so both run one build.
// `buildTokens` formats without writing, and the formats run every check first.
import { readFileSync } from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { createFormats } from "./formats.ts";
import type { DesignTokens } from "style-dictionary/types";
import type { Model } from "./model.ts";
import { parseFigmaTokens } from "./figma-parser.ts";

const here = import.meta.dirname;
const ui = path.resolve(here, "../../../packages/ui");

export const PATHS = {
  figma: path.join(ui, "tokens/figma.tokens.json"),
  shopblok: path.join(ui, "tokens/shopblok.tokens.json"),
  css: path.join(ui, "src/styles/tokens.css"),
  ts: path.join(ui, "src/tokens.ts"),
  fonts: path.resolve(here, "../../../apps/storefront/src/lib/fonts.ts"),
};

export type Sources = {
  figma: string;
  shopblok: string;
  /** apps/storefront/src/lib/fonts.ts, whose font variable the build checks; PATHS.fonts if absent. */
  fonts?: string;
};

export type Built = { model: Model; css: string; ts: string };

/**
 * `first` and `second` as one tree. A path in both is an error, as it is when Style Dictionary
 * reads two source files: `shopblok.tokens.json` may not redefine a token of the kit.
 */
function mergeDisjoint(
  first: DesignTokens,
  second: DesignTokens,
  at: string[] = [],
): DesignTokens {
  const isToken = (node: unknown) =>
    typeof node === "object" && node !== null && "$value" in node;
  const merged: Record<string, unknown> = { ...first };
  for (const [key, node] of Object.entries(second)) {
    const have = merged[key];
    if (have === undefined) merged[key] = node;
    else if (
      !isToken(have) &&
      !isToken(node) &&
      typeof have === "object" &&
      typeof node === "object"
    )
      merged[key] = mergeDisjoint(have as DesignTokens, node as DesignTokens, [
        ...at,
        key,
      ]);
    else
      throw new Error(
        `${[...at, key].join(".")} is defined in both shopblok.tokens.json and figma.tokens.json`,
      );
  }
  return merged as DesignTokens;
}

/**
 * The tokens of both files, parsed here and handed to Style Dictionary as an object, not as
 * `source` paths: a path is globbed, and it also becomes each token's `filePath`, which Style
 * Dictionary reads for `{references}`, so a checkout under a folder with `(`, `[` or `{` in its
 * name broke the build with "token is missing" errors, whatever the escaping.
 */
function readTokens(sources: Sources): DesignTokens {
  return mergeDisjoint(
    JSON.parse(readFileSync(sources.shopblok, "utf8")) as DesignTokens,
    parseFigmaTokens(readFileSync(sources.figma, "utf8")),
  );
}

async function dictionaryFor(
  tokens: DesignTokens,
  verbosity: "silent" | "verbose",
  formats: ReturnType<typeof createFormats>["formats"],
) {
  const dictionary = new StyleDictionary(
    {
      usesDtcg: true,
      tokens,
      hooks: {
        // A token's name is its whole path, so that no two share one (Style Dictionary reports
        // equal names in one output file as a collision, and `md` is in the radius and the shadows).
        transforms: {
          "shopblok/name": {
            type: "name",
            transform: (token) => token.path.join("."),
          },
        },
        formats,
      },
      // A reference to nothing, a cycle or a collision stops the build: no warning is enough.
      log: {
        verbosity,
        warnings: "error",
        errors: { brokenReferences: "throw" },
      },
      platforms: {
        css: {
          // The only transform is the name: the formats read the resolved values as they are.
          transforms: ["shopblok/name"],
          files: [
            { destination: "tokens.css", format: "shopblok/css" },
            { destination: "tokens.ts", format: "shopblok/ts" },
          ],
        },
      },
    },
    // `init: false` and an explicit `init()`, so that an error in it reaches the caller.
    { init: false, verbosity },
  );
  await dictionary.init();
  return dictionary;
}

/** Style Dictionary's error for a reference to nothing or a cycle, which says no more than this. */
const BROKEN_REFERENCES = /Some token references \(\d+\) could not be found/;

/**
 * One build: Style Dictionary resolves the tokens, the checks run on them once, and both files
 * are rendered from that one model. Nothing is written.
 *
 * Style Dictionary names a broken reference or a cycle only at `verbose`, which also prints a
 * line per file written. So only a failure of that kind is run once more, verbosely, and that
 * run's error is the one thrown. Any other failure (a check of ours, a bad parse) already says
 * everything, and a second run would only repeat it.
 */
export async function buildTokens(sources: Sources = PATHS): Promise<Built> {
  const fontsSource = readFileSync(sources.fonts ?? PATHS.fonts, "utf8");
  const tokens = readTokens(sources);
  const run = async (verbosity: "silent" | "verbose"): Promise<Built> => {
    const { formats, model } = createFormats({ fontsSource });
    // A copy, in case Style Dictionary changes what it is given: the rerun starts from the same tokens.
    const dictionary = await dictionaryFor(
      structuredClone(tokens),
      verbosity,
      formats,
    );
    const outputs = await dictionary.formatPlatform("css");
    const find = (destination: string): string => {
      const found = outputs.find((o) => o.destination === destination);
      if (typeof found?.output !== "string")
        throw new Error(`Style Dictionary wrote no ${destination}`);
      return found.output;
    };
    const built = model();
    if (!built) throw new Error("Style Dictionary ran no format");
    return { model: built, css: find("tokens.css"), ts: find("tokens.ts") };
  };
  try {
    return await run("silent");
  } catch (error) {
    if (!(error instanceof Error) || !BROKEN_REFERENCES.test(error.message))
      throw error;
    // The verbose run fails with the detail; if it somehow doesn't, the first error stands.
    return await run("verbose").then(() => {
      throw error;
    });
  }
}
