import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// D40: the registry is data, so Payload's CLI (M4) and Playwright's loader can import it. Neither can
// load React components, and `@shopblok/ui` is components, so no source file here may import React
// or another `@shopblok/*` package; zod is the one dependency.
const folder = import.meta.dirname;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(file);
    return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [file] : [];
  });
}

const specifiers = (source: string) =>
  [...source.matchAll(/\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]!);

describe("the registry's sources", () => {
  const files = sources(folder);

  it("are found", () => {
    expect(files.map((file) => path.relative(folder, file)).sort()).toContain("index.ts");
  });

  it.each(files.map((file) => [path.relative(folder, file), file]))(
    "%s imports neither React nor any @shopblok/* package",
    (_name, file) => {
      for (const specifier of specifiers(readFileSync(file, "utf8"))) {
        expect(specifier).not.toMatch(/^(?:react|react-dom|next)(?:\/|$)/);
        expect(specifier).not.toMatch(/^@shopblok\//);
        expect(specifier, "zod or a file of this package").toMatch(/^(?:zod(?:\/|$)|\.)/);
      }
    },
  );

  it("would see a forbidden import (the check itself)", () => {
    expect(specifiers('import { Button } from "@shopblok/ui/atoms/button";')).toEqual([
      "@shopblok/ui/atoms/button",
    ]);
    expect(specifiers('import type { ReactNode } from "react";')).toEqual(["react"]);
  });
});
