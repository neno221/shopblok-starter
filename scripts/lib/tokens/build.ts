// The Style Dictionary set-up (M1 plan, D26, T19). `scripts/figma-tokens.ts` writes what this
// returns and `committed.test.ts` compares it with the committed files, so both run one build.
// `formatPlatform` formats without writing, and the formats run every check first.
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { formats } from "./formats.ts";
import { buildModel, type Model } from "./model.ts";
import { parseFigmaTokens } from "./figma-parser.ts";

const here = import.meta.dirname;
const ui = path.resolve(here, "../../../packages/ui");

export const PATHS = {
  figma: path.join(ui, "tokens/figma.tokens.json"),
  shopblok: path.join(ui, "tokens/shopblok.tokens.json"),
  css: path.join(ui, "src/styles/tokens.css"),
  ts: path.join(ui, "src/tokens.ts"),
};

export type Sources = { figma: string; shopblok: string };

/** Style Dictionary globs its sources, and a glob wants forward slashes, on Windows too. */
const posix = (file: string): string => file.split(path.sep).join("/");

async function dictionaryFor(
  sources: Sources,
  verbosity: "silent" | "verbose",
) {
  const dictionary = new StyleDictionary(
    {
      usesDtcg: true,
      // `shopblok` first: both files are read in this order and a path in both is a collision.
      source: [sources.shopblok, sources.figma].map(posix),
      parsers: ["figma"],
      hooks: {
        parsers: {
          figma: {
            pattern: /figma\.tokens\.json$/,
            parser: ({ contents }) => parseFigmaTokens(contents),
          },
        },
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
    // `init: false` and an explicit `init()`, so that an error in a parser reaches the caller.
    { init: false, verbosity },
  );
  await dictionary.init();
  return dictionary;
}

/**
 * Runs `use` on a quiet build. Style Dictionary names a broken reference or a cycle only at
 * `verbose`, which also prints a line per file written, so a failed build is run once more,
 * verbosely, and that run's error is the one thrown.
 */
async function withDetail<T>(
  sources: Sources,
  use: (dictionary: StyleDictionary) => Promise<T>,
): Promise<T> {
  try {
    return await use(await dictionaryFor(sources, "silent"));
  } catch (error) {
    let thrown = error;
    try {
      await use(await dictionaryFor(sources, "verbose"));
    } catch (detailed) {
      thrown = detailed;
    }
    throw thrown;
  }
}

/** The resolved tokens of both files and the model the checks passed (or an error that says why not). */
export async function buildModelFrom(sources: Sources = PATHS): Promise<Model> {
  return withDetail(sources, async (dictionary) =>
    buildModel(await dictionary.getPlatformTokens("css")),
  );
}

/** The text of `tokens.css` and `tokens.ts`, built from the two files; nothing is written. */
export async function formatTokens(
  sources: Sources = PATHS,
): Promise<{ css: string; ts: string }> {
  return withDetail(sources, async (dictionary) => {
    const outputs = await dictionary.formatPlatform("css");
    const find = (destination: string): string => {
      const found = outputs.find((o) => o.destination === destination);
      if (typeof found?.output !== "string")
        throw new Error(`Style Dictionary wrote no ${destination}`);
      return found.output;
    };
    return { css: find("tokens.css"), ts: find("tokens.ts") };
  });
}
