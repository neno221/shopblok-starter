// `apps/storefront/vercel.json` and its two scripts (M7 D135, D136, D148; T114), checked without
// Vercel: the region, the filtered install, and the build's order (doctor, then on Production
// only the migrations and the seed, then the packages and `next build`).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const storefront = path.resolve(import.meta.dirname, "..", "..", "apps", "storefront");
const config = JSON.parse(readFileSync(path.join(storefront, "vercel.json"), "utf8")) as {
  framework: string;
  regions: string[];
  installCommand: string;
  buildCommand: string;
  ignoreCommand: string;
};
const script = (name: string) => readFileSync(path.join(storefront, "scripts", name), "utf8");
/** The script's commands, comments and blank lines left out. */
const commands = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

describe("vercel.json", () => {
  it("runs in one of the two regions next to Railway's Amsterdam (D132)", () => {
    expect(config.framework).toBe("nextjs");
    expect(config.regions).toHaveLength(1);
    expect(["fra1", "lhr1"]).toContain(config.regions[0]);
  });

  it("installs only the storefront, the scripts and what they use, from the lockfile", () => {
    expect(config.installCommand).toMatch(/^pnpm install --frozen-lockfile /);
    expect(config.installCommand).toContain('--filter "@shopblok/storefront..."');
    expect(config.installCommand).toContain('--filter "@shopblok/scripts..."');
  });

  it("builds and ignores through the scripts beside it, which are executable", () => {
    for (const [command, file] of [
      [config.buildCommand, "vercel-build.sh"],
      [config.ignoreCommand, "vercel-ignore.sh"],
    ] as const) {
      expect(command).toBe(`bash scripts/${file}`);
      // Git's mode, not the file system's: NTFS has no executable bit (windows-smoke).
      const stage = execFileSync("git", ["ls-files", "--stage", `scripts/${file}`], {
        cwd: storefront,
        encoding: "utf8",
      });
      expect(stage).toMatch(/^100755 /);
    }
  });
});

describe("scripts/vercel-build.sh", () => {
  const lines = commands(script("vercel-build.sh"));
  const at = (pattern: RegExp) => {
    const index = lines.findIndex((line) => pattern.test(line));
    expect(index, String(pattern)).toBeGreaterThanOrEqual(0);
    return index;
  };

  it("stops at the first failure", () => {
    expect(lines).toContain("set -euo pipefail");
  });

  it("checks first, strictly, and online on Production", () => {
    const doctor = at(/doctor=\(node .*doctor\.ts" --app=storefront --strict\)/);
    expect(lines[doctor + 1]).toBe('[ "$production" = true ] && doctor+=(--online)');
    expect(doctor).toBeLessThan(at(/payload migrate/));
  });

  it("builds the packages before the database changes, migrates and seeds on Production only, then builds", () => {
    const packages = at(/turbo run build --filter="@shopblok\/storefront\^\.\.\."/);
    const production = at(/^if \[ "\$production" = true \]; then$/);
    const migrate = at(/pnpm exec payload migrate/);
    const seed = at(/payload run src\/scripts\/seed-staging\.ts/);
    const close = lines.findIndex((line, index) => index > seed && line === "fi");
    expect(packages).toBeLessThan(production);
    expect(production).toBeLessThan(migrate);
    expect(migrate).toBeLessThan(seed);
    expect(lines[seed - 2]).toBe('if [ "$seed" = "payload" ]; then');
    expect(lines.indexOf('(cd "$STOREFRONT" && pnpm exec next build)')).toBeGreaterThan(close);
    expect(lines.at(-1)).toBe('(cd "$STOREFRONT" && pnpm exec next build)');
  });

  it("refuses an unknown SEED_ON_BUILD", () => {
    at(/if \[ "\$seed" != "" \] && \[ "\$seed" != "payload" \]; then/);
  });
});

describe("scripts/vercel-ignore.sh", () => {
  const lines = commands(script("vercel-ignore.sh"));

  it("asks turbo about the storefront and the scripts against the last deployment", () => {
    expect(lines.join("\n")).toMatch(
      /query affected --packages @shopblok\/storefront @shopblok\/scripts \\\n--base "\$base" --head HEAD --exit-code/,
    );
  });

  it("builds whenever it cannot tell: exit 0 only when turbo says nothing changed", () => {
    expect(lines.filter((line) => line === "exit 0")).toHaveLength(1);
    expect(lines[lines.indexOf("exit 0") - 2]).toBe("0)");
  });
});
