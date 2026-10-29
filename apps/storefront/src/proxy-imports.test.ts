import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// D10, D82 (T68): the proxy runs on every request, and loading Payload there cost 550 ms on a
// process's first request (T11). It reads the market map and the redirects over HTTP instead, and
// this test keeps it so: it follows every import `proxy.ts` makes, its own files and the
// workspace's packages, and fails if one reaches Payload. A type-only import is erased, so it does
// not count.

const dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFrom = createRequire(import.meta.url);

/** The specifiers a module loads at run time: `import … from`, `export … from`, `import()`. */
export function runtimeImports(source: string): string[] {
  const found: string[] = [];
  const statement =
    /(?:^|[\s;])(?:import|export)\s+(?!type[\s{])(?:[^"';]*?\sfrom\s*)?["']([^"']+)["']/g;
  for (const match of source.matchAll(statement)) if (match[1]) found.push(match[1]);
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g))
    if (match[1]) found.push(match[1]);
  return found;
}

const EXTENSIONS = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"];

function resolveFile(base: string): string | undefined {
  return EXTENSIONS.map((extension) => base + extension).find(
    (candidate) => existsSync(candidate) && !candidate.endsWith("/"),
  );
}

/** Where a specifier leads: a file to follow, or a package name that is not ours. */
function resolveSpecifier(specifier: string, from: string): { file?: string; external?: string } {
  if (specifier.startsWith(".")) {
    const file = resolveFile(path.resolve(path.dirname(from), specifier));
    return file === undefined ? { external: specifier } : { file };
  }
  if (specifier === "@payload-config") return { external: specifier };
  if (specifier.startsWith("@shopblok/")) {
    try {
      return { file: requireFrom.resolve(specifier, { paths: [path.dirname(from)] }) };
    } catch {
      return { external: specifier };
    }
  }
  return { external: specifier };
}

/** Every package the module graph from `entry` loads at run time, and the files it went through. */
export function importGraph(entry: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (files.has(file)) continue;
    files.add(file);
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    for (const specifier of runtimeImports(readFileSync(file, "utf8"))) {
      const { file: next, external } = resolveSpecifier(specifier, file);
      if (next !== undefined) queue.push(next);
      if (external !== undefined) packages.add(external);
    }
  }
  return { files, packages };
}

const isPayload = (name: string) =>
  name === "payload" ||
  name.startsWith("payload/") ||
  name.startsWith("@payloadcms/") ||
  name === "@payload-config";

describe("the proxy's import graph has no Payload (D10, D82)", () => {
  it("reads only the market map and the redirects, over HTTP", () => {
    const { files, packages } = importGraph(path.join(dirname, "proxy.ts"));
    const names = [...files].map((file) => path.relative(dirname, file));
    expect(names).toEqual(
      expect.arrayContaining([
        "lib/markets/proxy-market-map.ts",
        "lib/markets/proxy-response.ts",
        "lib/redirects/proxy-redirects.ts",
        "lib/redirects/match.ts",
      ]),
    );
    expect([...packages].filter(isPayload)).toEqual([]);
    // No file of the CMS's either: they are the Local API's.
    expect(
      names.filter((name) => name.startsWith("payload/") || name.startsWith("lib/cms/")),
    ).toEqual([]);
  });

  it("finds what a module imports at run time, and leaves type-only imports out", () => {
    expect(
      runtimeImports(
        [
          'import { a } from "./a";',
          'import type { B } from "payload";',
          'export { c } from "./c";',
          'export type { D } from "@payloadcms/ui";',
          'import "./side-effect";',
          'const e = await import("@payload-config");',
          'import f, { type G } from "payload";',
        ].join("\n"),
      ),
    ).toEqual(["./a", "./c", "./side-effect", "payload", "@payload-config"]);
  });
});
