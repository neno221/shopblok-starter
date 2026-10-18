// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). The rules every file of T39's
// organisms keeps, read from its source: the class rules (tokens, logical properties, light only, the
// ring at full strength), the T39 header, no em dash, nothing that cuts a label (but OrderTable's
// total, which stays on one line in its cell), and D49: a client part says why it is one and imports
// no catalog, no contract and no fixture, and a server part is no client component.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";

const EM_DASH = String.fromCharCode(0x2014);
const HEADER = '// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"';

const SERVER = [
  "account-nav.tsx",
  "address-book.tsx",
  "cart-drawer.tsx",
  "checkout-steps.tsx",
  "order-summary.tsx",
  "order-table.tsx",
  "order-timeline.tsx",
  "payment-methods-manager.tsx",
  "payment-step.tsx",
  "quick-cart-dropdown.tsx",
  "return-request-form.tsx",
];
const CLIENT = [
  "cart-drawer-client.tsx",
  "order-summary-lines.tsx",
  "quick-cart-dropdown-client.tsx",
];

const read = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
/** The modules a file imports at run time: a type-only import leaves no trace. */
const runtimeImports = (source: string) =>
  [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
    (match) => match[1] ?? "",
  );

describe.each([...SERVER, ...CLIENT])("%s", (name) => {
  const text = read(name);

  it("keeps the class rules: tokens, logical properties, light only", () => {
    expect(findViolations(text)).toEqual([]);
  });

  it("opens with the T39 header and uses no em dash", () => {
    expect(text.startsWith(HEADER)).toBe(true);
    expect(text).not.toContain(EM_DASH);
  });

  it("cuts no label", () => {
    const cutters = text
      .split("\n")
      .filter((line) => CLIPPING_CLASSES.test(line.replace(/"/g, " ")));
    if (name === "order-table.tsx") {
      expect(cutters).toHaveLength(1);
      expect(cutters[0]).toContain("text-end whitespace-nowrap");
    } else expect(cutters).toEqual([]);
  });
});

describe.each(CLIENT)("%s, a client part (D49)", (name) => {
  const text = read(name);

  it("is a client component and says why", () => {
    expect(text).toMatch(/^"use client";$/m);
    expect(text.split('"use client"')[0]).toMatch(/client component because/i);
  });

  it("imports no catalog, no formatter, no contract and no fixture", () => {
    const imported = runtimeImports(text);
    expect(imported.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
  });
});

describe.each(SERVER)("%s, a server part", (name) => {
  it("is no client component", () => {
    expect(read(name)).not.toMatch(/^\s*["']use client["']/m);
  });
});

describe("the server parts of the overlays (D49)", () => {
  it.each(["cart-drawer.tsx", "quick-cart-dropdown.tsx"])(
    "%s formats with the client-safe subpath, and its catalog import is types only",
    (name) => {
      const imported = runtimeImports(read(name));
      expect(imported).toContain("@shopblok/i18n/format");
      expect(imported).not.toContain("@shopblok/i18n");
    },
  );
});
