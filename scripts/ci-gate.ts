// The `gate` job of `.github/workflows/ci.yml` (M2 plan, D53; T27): decides which of `e2e-smoke`,
// `design-system` and `windows-smoke` run, through `lib/ci-gate.ts`, and writes the answer to
// `$GITHUB_OUTPUT`. Run with plain `node scripts/ci-gate.ts` from the repo root, with the event in
// `EVENT`; a pull request also needs `PULL`, `REPO` and `GH_TOKEN`, because its files come from the
// API (`gh api --paginate`, as `windows-gate` did). Without `GITHUB_OUTPUT` (a local run) it only
// prints. `node scripts/ci-gate.ts --files a b c` decides for a list of files instead of a PR.
import { execFileSync } from "node:child_process";
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { decideJobs, outputLines, runtimeImports, type Importer } from "./lib/ci-gate.ts";

const root = path.resolve(import.meta.dirname, "..");

// Where code that imports a DS-only folder can live. Tests are left out: a unit test runs in
// `check`, whatever the gate says.
const scanned = ["apps", "packages"];
const skippedFolders = new Set(["node_modules", ".next", ".turbo", "dist", "coverage", ".medusa"]);
const sourceFile = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/;
const testFile = /\.test\.(?:ts|tsx|mts|js|jsx|mjs)$/;

function sources(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(root, folder), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(folder, entry.name);
    if (entry.isDirectory()) {
      if (!skippedFolders.has(entry.name)) found.push(...sources(relative));
    } else if (entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name)) {
      found.push(relative);
    }
  }
  return found;
}

/**
 * Every run-time import in `apps/` and `packages/`, the DS-only areas' own too: `sharedAreas`
 * follows an import chain from outside the DS through them (a page, an organism, its molecules).
 */
function importers(): Importer[] {
  return scanned.flatMap(sources).flatMap((file) =>
    runtimeImports(readFileSync(path.join(root, file), "utf8")).map((specifier) => ({
      file,
      specifier,
    })),
  );
}

/** The PR's changed files, both names of a rename, from the API. */
function pullRequestFiles(repo: string, pull: string): string[] {
  const output = execFileSync(
    "gh",
    [
      "api",
      "--paginate",
      `repos/${repo}/pulls/${pull}/files`,
      "--jq",
      ".[] | .filename, (.previous_filename // empty)",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return output.split("\n").filter((line) => line !== "");
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`ci-gate: ${name} is not set.`);
  return value;
}

const listed = process.argv.indexOf("--files");
const event = listed === -1 ? required("EVENT") : "pull_request";
const files =
  listed !== -1
    ? process.argv.slice(listed + 1)
    : event === "pull_request"
      ? pullRequestFiles(required("REPO"), required("PULL"))
      : [];

const decision = decideJobs({
  event,
  files,
  importers: event === "pull_request" ? importers() : [],
});
if (event === "pull_request") console.log(`${files.length} changed files`);
for (const reason of decision.reasons) console.log(reason);
const outputFile = process.env["GITHUB_OUTPUT"];
if (outputFile !== undefined && outputFile !== "" && listed === -1) {
  appendFileSync(outputFile, outputLines(decision).join("\n") + "\n");
}
