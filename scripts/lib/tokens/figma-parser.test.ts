import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFigmaTokens } from "./figma-parser.ts";

const real = readFileSync(
  new URL("../../../packages/ui/tokens/figma.tokens.json", import.meta.url),
  "utf8",
);

function file(collections: unknown[], styles?: unknown): string {
  return JSON.stringify({ collections, ...(styles ? { styles } : {}) });
}

function collection(
  name: string,
  modes: string[],
  defaultMode: string,
  variables: unknown[],
) {
  return { name, modes, defaultMode, variables };
}

const color = (name: string, values: Record<string, unknown>) => ({
  name,
  type: "COLOR",
  scopes: ["ALL_SCOPES"],
  codeSyntax: {},
  description: "",
  values,
});

type Obj = Record<string, unknown>;

/** The node of `tree` at `path`: a group or a token, whatever the parser put there. */
function at(tree: unknown, ...path: string[]): Obj {
  let node = tree as Obj;
  for (const segment of path) {
    const next = node[segment];
    if (typeof next !== "object" || next === null)
      throw new Error(`no ${path.join(".")} in the tree`);
    node = next as Obj;
  }
  return node;
}

function flatten(
  node: unknown,
  path: string[] = [],
): { path: string[]; token: Obj }[] {
  if (typeof node !== "object" || node === null) return [];
  if ("$value" in node) return [{ path, token: node }];
  return Object.entries(node).flatMap(([key, child]) =>
    flatten(child, [...path, key]),
  );
}

describe("modes", () => {
  it("takes the mode named Light, whatever the default is", () => {
    const tree = parseFigmaTokens(
      file([
        collection("Mode", ["Dark", "Light"], "Dark", [
          color("base/a", { Dark: "#000000", Light: "#ffffff" }),
        ]),
      ]),
    );
    expect(at(tree, "Mode", "base", "a")).toEqual({
      $type: "color",
      $value: "#ffffff",
    });
  });

  it("takes the default mode of a collection with no Light", () => {
    const tree = parseFigmaTokens(
      file([
        collection("Device", ["Phone", "Tablet"], "Phone", [
          { name: "Gutter", type: "FLOAT", values: { Phone: 16, Tablet: 24 } },
        ]),
      ]),
    );
    expect(at(tree, "Device", "Gutter")["$value"]).toBe(16);
  });

  it("fails on a variable with no value in the mode", () => {
    expect(() =>
      parseFigmaTokens(
        file([
          collection("Mode", ["Light"], "Light", [
            color("a", { Dark: "#000000" }),
          ]),
        ]),
      ),
    ).toThrow(/Mode\/a has no value in the mode Light/);
  });
});

describe("values", () => {
  it("writes an alias as a {collection.path} reference, whatever the collection's name", () => {
    const tree = parseFigmaTokens(
      file([
        collection("TailwindCSS - Colors", ["Light"], "Light", [
          color("Red/Red-600", { Light: "#e7000b" }),
        ]),
        collection("Mode", ["Light"], "Light", [
          color("state/destructive", {
            Light: { alias: "TailwindCSS - Colors/Red/Red-600" },
          }),
        ]),
      ]),
    );
    expect(at(tree, "Mode", "state", "destructive")["$value"]).toBe(
      "{TailwindCSS - Colors.Red.Red-600}",
    );
  });

  it("refuses an alias into a collection the file does not have", () => {
    expect(() =>
      parseFigmaTokens(
        file([
          collection("Mode", ["Light"], "Light", [
            color("a", { Light: { alias: "Nowhere/a" } }),
          ]),
        ]),
      ),
    ).toThrow(/Mode\/a: the alias "Nowhere\/a" names no collection/);
  });

  it("keeps a reference to a variable that does not exist, for Style Dictionary to fail on", () => {
    const tree = parseFigmaTokens(
      file([
        collection("Mode", ["Light"], "Light", [
          color("a", { Light: { alias: "Mode/missing" } }),
        ]),
      ]),
    );
    expect(at(tree, "Mode", "a")["$value"]).toBe("{Mode.missing}");
  });

  it("refuses a colour that is not lowercase #rrggbb(aa)", () => {
    for (const bad of ["#FFFFFF", "#fff", "white", "#ffffff0"]) {
      expect(() =>
        parseFigmaTokens(
          file([
            collection("Mode", ["Light"], "Light", [
              color("a", { Light: bad }),
            ]),
          ]),
        ),
      ).toThrow(/not a lowercase #rrggbb\(aa\) colour/);
    }
  });

  it("types the font family, numbers and colours", () => {
    const tree = parseFigmaTokens(
      file([
        collection("Shadcn", ["Mode 1"], "Mode 1", [
          {
            name: "font/family/font-sans",
            type: "STRING",
            values: { "Mode 1": "Inter" },
          },
          { name: "radius/lg", type: "FLOAT", values: { "Mode 1": 10 } },
        ]),
      ]),
    );
    expect(at(tree, "Shadcn", "font", "family", "font-sans")).toEqual({
      $type: "fontFamily",
      $value: "Inter",
    });
    expect(at(tree, "Shadcn", "radius", "lg")).toEqual({
      $type: "number",
      $value: 10,
    });
  });

  it("refuses a name that is a variable and a group", () => {
    expect(() =>
      parseFigmaTokens(
        file([
          collection("Mode", ["Light"], "Light", [
            color("a", { Light: "#000000" }),
            color("a/b", { Light: "#000000" }),
          ]),
        ]),
      ),
    ).toThrow(/Mode\/a\/b sits inside the variable Mode\/a/);
  });
});

describe("styles", () => {
  const text = (name: string, size = 12) => ({
    name,
    fontFamily: "Inter",
    fontStyle: "Semi Bold",
    fontSize: size,
    lineHeight: { unit: "PIXELS", value: 16 },
    letterSpacing: { unit: "PERCENT", value: 0 },
    boundVariables: { fontSize: { alias: "TailwindCSS/text/xs/font-size" } },
  });

  it("keeps two text styles of one name, as T18 found in the kit", () => {
    const tree = parseFigmaTokens(
      file([], {
        text: [text("text-xs/semibold", 12), text("text-xs/semibold", 13)],
      }),
    );
    const styles = flatten(at(tree, "Text styles"));
    expect(styles.map((s) => s.path.join("/"))).toEqual([
      "text-xs/semibold",
      "text-xs/semibold (2)",
    ]);
    expect(styles.map((s) => (s.token["$value"] as Obj)["fontSize"])).toEqual([
      "12px",
      "13px",
    ]);
    expect((styles[0]!.token["$value"] as Obj)["fontWeight"]).toBe(600);
  });

  it("records a text style's unknown weight and units as the kit writes them, and does not throw", () => {
    const tree = parseFigmaTokens(
      file([], {
        text: [
          {
            ...text("text-xs/auto"),
            fontStyle: "Extra Bold",
            lineHeight: { unit: "AUTO" },
            letterSpacing: { unit: "EM", value: 2 },
          },
          {
            ...text("text-xs/odd"),
            lineHeight: { unit: "LINES", value: 3 },
          },
        ],
      }),
    );
    expect(at(tree, "Text styles", "text-xs", "auto")["$value"]).toEqual({
      fontFamily: "Inter",
      fontSize: "12px",
      fontWeight: "Extra Bold",
      letterSpacing: "2 EM",
      lineHeight: "normal",
    });
    expect(
      (at(tree, "Text styles", "text-xs", "odd")["$value"] as Obj)[
        "lineHeight"
      ],
    ).toBe("3 LINES");
  });

  it("writes a shadow from the style's own values and no reference, even where the style binds to a variable the kit no longer lists", () => {
    const tree = parseFigmaTokens(
      file([], {
        effect: [
          {
            name: "shadow/md",
            effects: [
              {
                type: "DROP_SHADOW",
                visible: true,
                color: "#0000001a",
                offset: { x: 0, y: 4 },
                radius: 6,
                spread: -1,
                boundVariables: {
                  color: { alias: "Shadcn/shadow/md/color", unlisted: true },
                },
              },
            ],
          },
        ],
      }),
    );
    expect(JSON.stringify(tree)).not.toMatch(/Shadcn|\{[A-Z]/);
    expect(at(tree, "Effect styles", "shadow", "md")["$value"]).toEqual([
      {
        color: "#0000001a",
        offsetX: "0px",
        offsetY: "4px",
        blur: "6px",
        spread: "-1px",
      },
    ]);
  });

  it("refuses an effect it does not know", () => {
    expect(() =>
      parseFigmaTokens(
        file([], {
          effect: [
            {
              name: "x",
              effects: [{ type: "INNER_SHADOW", visible: true, radius: 1 }],
            },
          ],
        }),
      ),
    ).toThrow(/neither a drop shadow nor a background blur/);
  });
});

describe("the committed export", () => {
  const tree = parseFigmaTokens(real);
  const tokens = flatten(tree);
  const kit = JSON.parse(real) as {
    collections: { variables: unknown[] }[];
    styles: { text: unknown[]; effect: unknown[] };
  };

  it("has one token for each variable and each style, none dropped", () => {
    const variables = kit.collections.reduce(
      (n, c) => n + c.variables.length,
      0,
    );
    expect(variables).toBe(1029);
    expect(kit.styles.text).toHaveLength(92);
    expect(kit.styles.effect).toHaveLength(14);
    expect(tokens).toHaveLength(1029 + 92 + 14);
  });

  it("keeps all three duplicated text-style names", () => {
    const names = flatten(at(tree, "Text styles")).map((s) => s.path.join("/"));
    for (const name of [
      "text-6xl/leading-none/medium",
      "text-6xl/leading-regular/regular",
      "text-xs/leading-normal/semibold",
    ]) {
      expect(names).toContain(name);
      expect(names).toContain(`${name} (2)`);
    }
  });

  it("holds light values only", () => {
    expect(at(tree, "Mode", "base", "background")["$value"]).toBe("#ffffff");
    expect(at(tree, "Mode", "base", "muted-foreground")["$value"]).toBe(
      "#737373",
    );
    expect(
      at(tree, "TailwindCSS - Colors", "Neutral", "Neutral-950")["$value"],
    ).toBe("#0a0a0a");
  });

  it("references nothing in the unlisted Shadcn/shadow group", () => {
    expect(JSON.stringify(tree)).not.toContain("Shadcn.shadow");
  });

  it("has colours as strings, never as objects", () => {
    for (const { token } of tokens.filter((t) => t.token["$type"] === "color"))
      expect(typeof token["$value"]).toBe("string");
  });
});
