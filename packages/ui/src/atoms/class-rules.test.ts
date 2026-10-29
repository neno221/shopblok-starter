import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findViolations, splitClass } from "../test-support/class-rules";

const atomsDir = import.meta.dirname;
const atomFiles = readdirSync(atomsDir).filter(
  (name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"),
);

// D42: the rules hold in the folders of components (the sections too, D70). A folder that does not
// exist yet has nothing to scan.
const folders = ["atoms", "primitives", "molecules", "organisms", "sections"] as const;
const srcDir = path.join(atomsDir, "..");

function componentFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(file);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx") ? [file] : [];
  });
}

// Relative paths with `/` on every OS: on Windows `path.relative` gives `primitives\…`.
const scanned = folders.flatMap((folder) =>
  componentFiles(path.join(srcDir, folder)).map((file) =>
    path.relative(srcDir, file).split(path.sep).join("/"),
  ),
);

describe("every file in src/atoms/", () => {
  it("has the 17 shadcn atoms (plan T21, D31)", () => {
    const expected = [
      "avatar",
      "badge",
      "button",
      "checkbox",
      "input",
      "kbd",
      "label",
      "native-select",
      "progress",
      "radio-group",
      "select",
      "separator",
      "skeleton",
      "spinner",
      "switch",
      "textarea",
      "tooltip",
    ];
    expect(atomFiles.map((name) => name.replace(/\.tsx$/, ""))).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it("has the 15 others of T23 (D31): the 32 atoms of SPEC §9.3, and no other file", () => {
    const others = [
      "chip",
      "flag",
      "icon",
      "icon-button",
      "image",
      "link",
      "logo",
      "payment-icon",
      "price",
      "quantity-stepper",
      "rating",
      "size-pill",
      "stock-indicator",
      "swatch",
      "visually-hidden",
    ];
    expect(atomFiles.map((name) => name.replace(/\.tsx$/, ""))).toEqual(
      expect.arrayContaining(others),
    );
    expect(atomFiles).toHaveLength(17 + others.length);
  });

  it('keeps Flag a server component: no "use client", so the flags cost no client JavaScript', () => {
    const source = readFileSync(path.join(atomsDir, "flag.tsx"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });
});

describe("every component file in src/{atoms,primitives,molecules,organisms}/", () => {
  it("includes the primitives (T31, D47)", () => {
    expect(scanned.filter((file) => file.startsWith("primitives/")).length).toBeGreaterThan(0);
  });

  it.each(scanned)(
    "%s: logical directions, token colours, light only, ring at full strength",
    (name) => {
      expect(findViolations(readFileSync(path.join(srcDir, name), "utf8"))).toEqual([]);
    },
  );

  it.each(scanned)("%s: names its source in a header", (name) => {
    const source = readFileSync(path.join(srcDir, name), "utf8");
    expect(source.split("\n")[0]).toMatch(/^\/\/ (Vendored from|Ours|From)/);
  });
});

// The plan's mutations (T21 Verify): each rule must catch what it is there for.
describe("the rules catch", () => {
  const cases: [string, string, string][] = [
    ["physical direction", `className="flex pl-2"`, "pl-2"],
    [
      "physical direction",
      `className="has-data-[icon=inline-end]:pr-2"`,
      "has-data-[icon=inline-end]:pr-2",
    ],
    ["physical direction", `cn("ml-auto")`, "ml-auto"],
    ["physical direction", `"-mr-1"`, "-mr-1"],
    ["physical direction", `"absolute right-2"`, "right-2"],
    ["physical direction", `"data-[side=left]:-left-1"`, "data-[side=left]:-left-1"],
    ["physical direction", `"text-left"`, "text-left"],
    ["physical direction", `"rounded-l-md"`, "rounded-l-md"],
    ["physical direction", `"rounded-tr-lg"`, "rounded-tr-lg"],
    ["physical direction", `"border-r"`, "border-r"],
    ["physical direction", `"border-l-2"`, "border-l-2"],
    ["physical direction", `"slide-in-from-left-2"`, "slide-in-from-left-2"],
    ["colour literal", `"bg-[#ff0000]"`, "bg-[#ff0000]"],
    ["colour literal", `"text-red-500"`, "text-red-500"],
    ["colour literal", `"text-white"`, "text-white"],
    ["colour literal", `"bg-black/50"`, "bg-black/50"],
    ["colour literal", `"bg-[Canvas]"`, "bg-[Canvas]"],
    ["colour literal", `style={{ color: "rgb(0 0 0)" }}`, "rgb(0 0 0)"],
    ["dark variant", `"dark:bg-input/30"`, "dark:bg-input/30"],
    [
      "dark variant",
      `"dark:aria-invalid:border-destructive/50"`,
      "dark:aria-invalid:border-destructive/50",
    ],
    ["ring alpha", `"focus-visible:ring-ring/50"`, "focus-visible:ring-ring/50"],
    ["ring alpha", `"focus-visible:ring-destructive/20"`, "focus-visible:ring-destructive/20"],
    ["ring alpha", `"aria-invalid:ring-destructive/20"`, "aria-invalid:ring-destructive/20"],
    [
      "ring alpha",
      `"dark:aria-invalid:ring-destructive/40"`,
      "dark:aria-invalid:ring-destructive/40",
    ],
  ];

  it.each(cases)("%s: %s", (rule, source, token) => {
    expect(findViolations(source)).toContainEqual({ rule, token });
  });
});

describe("the rules let through", () => {
  it.each([
    `"ps-2 pe-8 ms-auto me-1 start-0 end-2 -start-1 text-start text-end rounded-s-md border-e"`,
    `"px-2 py-1 mx-auto -mx-1 my-1 inset-0 top-1/2 -translate-y-1/2"`,
    `"bg-primary text-primary-foreground ring-ring border-input text-destructive bg-destructive/20"`,
    `"hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]"`,
    `"data-[side=left]:top-1/2 slide-in-from-start-2 text-[13px] bg-[var(--x)]"`,
    `side = "left"`,
    `"ring-1 ring-foreground/10 ring-2 ring-background"`,
    `// pl-2 and dark:bg-black/50 in a comment\n"ps-2"`,
    `/* text-left, #fff */ "text-start"`,
  ])("%s", (source) => {
    expect(findViolations(source)).toEqual([]);
  });
});

describe("splitClass", () => {
  it("separates variants from the utility, brackets included", () => {
    expect(splitClass("data-[side=top]:md:-translate-y-1/2!")).toEqual({
      variants: ["data-[side=top]", "md"],
      utility: "translate-y-1/2",
    });
    expect(splitClass("[&_svg:not([class*='size-'])]:size-4")).toEqual({
      variants: ["[&_svg:not([class*='size-'])]"],
      utility: "size-4",
    });
  });
});
