// The Verify mutations of M1 plan T19, run on copies of the two token files in a temporary folder:
// each change must stop the build, or change its output, in the way the plan says.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { formatTokens, PATHS, type Sources } from "./build.ts";

vi.setConfig({ testTimeout: 30_000 });

const folders: string[] = [];
afterAll(() => {
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true });
});

type Variable = { name: string; values: Record<string, unknown> };
type Kit = {
  collections: { name: string; variables: Variable[] }[];
  styles: { effect: { name: string }[] };
};
type Pair = { $value: Record<string, unknown> };
type Own = {
  semantic: Record<string, { $value: unknown }>;
  contrast: { text: Record<string, Pair>; ui: Record<string, Pair> };
};

/** The two files, with `kit` and `shopblok` free to change a parsed copy of each. */
function mutated(change: {
  kit?: (file: Kit) => void;
  shopblok?: (file: Own) => void;
}): Sources {
  const folder = mkdtempSync(path.join(os.tmpdir(), "shopblok-tokens-"));
  folders.push(folder);
  const kit = JSON.parse(readFileSync(PATHS.figma, "utf8")) as Kit;
  const shopblok = JSON.parse(readFileSync(PATHS.shopblok, "utf8")) as Own;
  change.kit?.(kit);
  change.shopblok?.(shopblok);
  const figma = path.join(folder, "figma.tokens.json");
  const own = path.join(folder, "shopblok.tokens.json");
  writeFileSync(figma, JSON.stringify(kit));
  writeFileSync(own, JSON.stringify(shopblok));
  return { figma, shopblok: own };
}

function variable(kit: Kit, collection: string, name: string): Variable {
  const found = kit.collections
    .find((c) => c.name === collection)
    ?.variables.find((v) => v.name === name);
  if (!found)
    throw new Error(
      `the test names ${collection}/${name}, which the kit lacks`,
    );
  return found;
}

describe("a colour changed in figma.tokens.json", () => {
  it("changes tokens.css, so the committed-file test fails", async () => {
    const committed = readFileSync(PATHS.css, "utf8");
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Mode", "base/border").values["Light"] = "#e4e4e4";
      },
    });
    const { css } = await formatTokens(sources);
    expect(css).not.toBe(committed);
    expect(css).toContain("--border: #e4e4e4;");
  });
});

describe("an alias to a missing variable", () => {
  it("fails the build and names the variable and the target", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Mode", "state/destructive").values["Light"] = {
          alias: "TailwindCSS - Colors/Red/Red-6000",
        };
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /\{Mode\.state\.destructive\} tries to reference \{TailwindCSS - Colors\.Red\.Red-6000\}, which is not defined/,
    );
  });

  it("fails on an alias into a collection that is not in the file", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Mode", "base/ring").values["Light"] = {
          alias: "Gone/ring",
        };
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /Mode\/base\/ring: the alias "Gone\/ring" names no collection/,
    );
  });

  it("fails on a reference in shopblok.tokens.json to nothing", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["price"]!.$value =
          "{TailwindCSS - Colors.Neutral.Neutral-9500}";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /\{semantic\.price\} tries to reference \{TailwindCSS - Colors\.Neutral\.Neutral-9500\}/,
    );
  });

  it("fails on a cycle and names it", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Mode", "base/accent").values["Light"] = {
          alias: "Mode/base/accent-foreground",
        };
        variable(kit, "Mode", "base/accent-foreground").values["Light"] = {
          alias: "Mode/base/accent",
        };
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /Circular definition cycle/,
    );
  });
});

describe("an overridden pair put back to the kit's failing value", () => {
  it("names the pair, both colours and the ratio", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["input"]!.$value = "{Mode.base.input}";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      "contrast ui.input-on-background: input #e5e5e5 on background #ffffff is 1.26:1, needs 3:1",
    );
  });

  it("does the same for the ring, at the alpha the pair names", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["ring"]!.$value = "{Mode.base.ring}";
        file.contrast.ui["ring-on-background"]!.$value["alpha"] = 0.5;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      "contrast ui.ring-on-background: ring #a1a1a1 at 50 % on background #ffffff is 1.54:1, needs 3:1",
    );
  });

  it("does the same for muted text on muted", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["muted-foreground"]!.$value =
          "{Mode.base.muted-foreground}";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      "contrast text.muted-foreground-on-muted: muted-foreground #737373 on muted #f5f5f5 is 4.35:1, needs 4.5:1",
    );
  });

  it("reports every failing pair at once", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["input"]!.$value = "{Mode.base.input}";
        file.semantic["destructive-foreground"]!.$value =
          "{Mode.state.destructive-foreground}";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /text\.destructive-foreground-on-destructive[^]*ui\.input-on-background/,
    );
  });

  it("stops a commerce token that no longer reaches 4.5:1", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["price-sale"]!.$value =
          "{TailwindCSS - Colors.Red.Red-400}";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /contrast text\.price-sale-on-background: price-sale #[0-9a-f]{6} on background #ffffff is \d\.\d\d:1, needs 4\.5:1/,
    );
  });

  it("composites the scrim before it measures the text on it", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.semantic["overlay"]!.$value = "#00000033";
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /contrast text\.overlay-foreground-on-overlay: .* over background #ffffff/,
    );
  });
});

describe("a pair or a token that goes missing", () => {
  it("fails if a contract variable no pair mentions is missing", async () => {
    const sources = mutated({
      shopblok: (file) => {
        delete file.semantic["sidebar-ring"];
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /semantic\.sidebar-ring is missing from shopblok\.tokens\.json/,
    );
  });

  it("fails if a commerce token a pair mentions is missing", async () => {
    const sources = mutated({
      shopblok: (file) => {
        delete file.semantic["stock-low"];
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /tries to reference \{semantic\.stock-low\}, which is not defined/,
    );
  });

  it("fails if an override sits in no declared pair", async () => {
    const sources = mutated({
      shopblok: (file) => {
        delete file.contrast.ui["ring-on-background"];
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /semantic\.ring overrides the kit and sits in no contrast pair/,
    );
  });

  it("fails if a text pair asks for less than 4.5:1", async () => {
    const sources = mutated({
      shopblok: (file) => {
        file.contrast.text["price-on-background"]!.$value["minimum"] = 3;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /a text pair needs 4\.5:1, it says 3/,
    );
  });
});

describe("a radius off the derived scale", () => {
  it("names the step and both values", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Shadcn", "radius/3xl").values["Mode 1"] = 24;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      "radius 3xl: the kit has 24px; --radius (10px) + 12px gives 22px",
    );
  });

  it("fails when the base moves and the rest does not follow", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "Shadcn", "radius/lg").values["Mode 1"] = 12;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /radius xl: the kit has 14px/,
    );
  });
});

describe("a spacing value off the 4 px step", () => {
  it("names the variable", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "TailwindCSS", "gap/gap-3").values["Value"] = 13;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      "spacing TailwindCSS.gap.gap-3: 13px, but Tailwind's gap-3 is 12px (a 4px step)",
    );
  });

  it("covers padding, whose names are nested one level deeper", async () => {
    const sources = mutated({
      kit: (kit) => {
        variable(kit, "TailwindCSS", "padding/padding-x/px-4").values["Value"] =
          15;
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /spacing TailwindCSS\.padding\.padding-x\.px-4: 15px/,
    );
  });
});

describe("a style that goes missing from the kit's file", () => {
  it("fails, because tokens.css reads the shadows from the effect styles", async () => {
    const sources = mutated({
      kit: (kit) => {
        kit.styles.effect = kit.styles.effect.filter(
          (e) => e.name !== "shadow/md",
        );
      },
    });
    await expect(formatTokens(sources)).rejects.toThrow(
      /Effect styles\.shadow\.md is missing/,
    );
  });
});
