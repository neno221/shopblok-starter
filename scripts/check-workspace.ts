// Workspace checks (T03). Run with plain `node scripts/check-workspace.ts [repo-root]`.
// pnpm's isolated layout (D6) and source-only shared packages (D3) rely on three things:
//   1. each app resolves its own React: 19.3.0 for the storefront and packages/ui, 18.3.1 for the
//      backend, and the storefront's Payload packages resolve its `@types/react` (19) too;
//   2. exactly one installed version of `payload` and of each `@payloadcms/*` package;
//   3. every `@shopblok/*` dependency links to its folder under `packages/`, so edits are live.
// A check with nothing to look at yet (no storefront, no Payload) is skipped. Exit code 1 if any fails.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { installedPayloadVersions } from "./lib/pnpm-store.ts";

type Result = { status: "ok" | "skip" | "fail"; lines: string[] };
type PackageJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, ".."));

// Keep in step with `packages` in pnpm-workspace.yaml.
const workspaceGlobs = ["apps", "packages"];
const workspaceSingles = ["scripts"];

function readJson(file: string): PackageJson {
  return JSON.parse(readFileSync(file, "utf8")) as PackageJson;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** The version of the package `name` that code in `fromDir` resolves, or undefined if it finds none. */
function resolveVersion(fromDir: string, name: string): string | undefined {
  try {
    const file = createRequire(path.join(fromDir, "package.json")).resolve(`${name}/package.json`);
    // Only count a copy that sits in this repo's node_modules, not one from a global folder.
    if (!isInside(path.join(realpathSync(root), "node_modules"), realpathSync(file)))
      return undefined;
    return readJson(file).version;
  } catch {
    return undefined;
  }
}

// Which React each app must see, and the dependencies (besides the app itself) whose own
// React must match: pnpm gives `next` and Payload's packages the React that the app installs.
// `@payloadcms/next` declares no `react` peer, and it and the two other Payload packages declare
// no `@types/react`, so they only get the app's through the `packageExtensions` entries in
// pnpm-workspace.yaml (T09); without them, pnpm resolves both from its shared hoist folder, which
// holds the backend's React 18.3.1 and `@types/react` 18. `types` is the `@types/react` major
// that the app and the dependencies marked `types` must see (`next` takes no types from there).
const reactTargets: {
  app: string;
  version: string;
  types?: string;
  via: { name: string; types?: boolean }[];
}[] = [
  {
    app: "apps/storefront",
    version: "19.3.0",
    types: "19",
    via: [
      { name: "next" },
      { name: "@payloadcms/next", types: true },
      { name: "@payloadcms/ui", types: true },
      { name: "@payloadcms/richtext-lexical", types: true },
    ],
  },
  { app: "apps/backend", version: "18.3.1", via: [] },
  // The markets plugin's admin extensions bundle into Medusa Admin, which has React 18 (T73).
  { app: "packages/medusa-markets", version: "18.3.1", via: [] },
  // packages/ui renders and tests components (D30): React and its types are peers and dev
  // dependencies there, so its own copy must be the storefront's.
  { app: "packages/ui", version: "19.3.0", types: "19", via: [{ name: "@base-ui/react" }] },
];

function checkReact(): Result {
  const lines: string[] = [];
  let failed = false;
  let checked = 0;
  for (const { app, version, types, via } of reactTargets) {
    const appDir = path.join(root, app);
    if (!existsSync(path.join(appDir, "package.json"))) {
      lines.push(`skip  ${app}: does not exist yet`);
      continue;
    }
    const declared = readJson(path.join(appDir, "package.json"));
    const declares = (name: string) =>
      [declared.dependencies, declared.devDependencies, declared.optionalDependencies].some(
        (group) => group !== undefined && name in group,
      );
    const starts = [{ label: app, dir: appDir, types }];
    for (const { name, types: typed } of via) {
      if (!declares(name)) {
        lines.push(`skip  ${app} → ${name}: not a dependency yet`);
        continue;
      }
      try {
        starts.push({
          label: `${app} → ${name}`,
          dir: realpathSync(path.join(appDir, "node_modules", ...name.split("/"))),
          types: typed ? types : undefined,
        });
      } catch {
        failed = true;
        lines.push(`FAIL  ${app} → ${name}: declared but not installed (run pnpm install)`);
      }
    }
    for (const { label, dir, types: typesMajor } of starts) {
      checked++;
      const found = resolveVersion(dir, "react");
      if (found === version) {
        lines.push(`ok    ${label}: react ${found}`);
      } else {
        failed = true;
        lines.push(`FAIL  ${label}: react ${found ?? "not found"}, expected ${version}`);
      }
      if (typesMajor === undefined) continue;
      checked++;
      const foundTypes = resolveVersion(dir, "@types/react");
      if (foundTypes?.split(".")[0] === typesMajor) {
        lines.push(`ok    ${label}: @types/react ${foundTypes}`);
      } else {
        failed = true;
        lines.push(
          `FAIL  ${label}: @types/react ${foundTypes ?? "not found"}, expected ${typesMajor}.x`,
        );
      }
    }
  }
  return { status: failed ? "fail" : checked === 0 ? "skip" : "ok", lines };
}

function checkPayload(): Result {
  const store = path.join(root, "node_modules", ".pnpm");
  if (!existsSync(store)) {
    return { status: "fail", lines: ["FAIL  node_modules/.pnpm not found (run pnpm install)"] };
  }
  // Found by each store folder's own package, not by the folder's name, which pnpm shortens.
  const found = installedPayloadVersions(store);
  if (found.size === 0) {
    return { status: "skip", lines: ["skip  no payload or @payloadcms packages installed yet"] };
  }
  const lines: string[] = [];
  let failed = false;
  for (const [name, versions] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
    if (versions.size > 1) {
      failed = true;
      lines.push(`FAIL  ${name}: ${[...versions].sort().join(", ")} are all installed`);
    }
  }
  if (!failed) {
    const names = [...found.keys()].sort();
    lines.push(`ok    ${names.length} packages, one version each: ${names.join(", ")}`);
  }
  return { status: failed ? "fail" : "ok", lines };
}

function workspaceDirs(): string[] {
  const dirs = workspaceSingles.map((dir) => path.join(root, dir));
  for (const parent of workspaceGlobs) {
    const parentDir = path.join(root, parent);
    if (!existsSync(parentDir)) continue;
    for (const entry of readdirSync(parentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(path.join(parentDir, entry.name));
    }
  }
  return dirs.filter((dir) => existsSync(path.join(dir, "package.json")));
}

/** Why the `@shopblok/*` dependency `name` of the package in `dir` doesn't link live, if it doesn't. */
function linkProblem(dir: string, name: string, spec: string): string | undefined {
  if (!spec.startsWith("workspace:")) return `is "${spec}", not a workspace: spec`;
  const target = path.join(root, "packages", name.slice("@shopblok/".length));
  const manifest = path.join(target, "package.json");
  if (!existsSync(manifest)) return "has no folder under packages/";
  if (readJson(manifest).name !== name) return "has a folder with another name";
  let linked: string;
  try {
    linked = realpathSync(path.join(dir, "node_modules", ...name.split("/")));
  } catch {
    return "is not installed (run pnpm install)";
  }
  // A copy under node_modules/.pnpm would resolve elsewhere, and edits wouldn't show up (D3).
  return linked === realpathSync(target) ? undefined : `resolves to ${linked}, not ${target}`;
}

function checkWorkspaceLinks(): Result {
  const lines: string[] = [];
  let failed = false;
  let links = 0;
  for (const dir of workspaceDirs()) {
    const from = path.relative(root, dir).split(path.sep).join("/");
    const manifest = readJson(path.join(dir, "package.json"));
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    };
    for (const [name, spec] of Object.entries(dependencies)) {
      if (!name.startsWith("@shopblok/")) continue;
      links++;
      const problem = linkProblem(dir, name, spec);
      if (problem === undefined) {
        lines.push(`ok    ${from} → ${name}`);
      } else {
        failed = true;
        lines.push(`FAIL  ${from} → ${name}: ${problem}`);
      }
    }
  }
  if (links === 0) lines.push("skip  no @shopblok/* dependencies yet");
  return { status: failed ? "fail" : links === 0 ? "skip" : "ok", lines };
}

const checks: [string, () => Result][] = [
  ["React per app", checkReact],
  ["Payload versions", checkPayload],
  ["Workspace packages", checkWorkspaceLinks],
];

let failures = 0;
for (const [title, run] of checks) {
  // A thrown error (an unreadable manifest, an incomplete store folder) is a failed check with
  // a reason, not a stack trace that hides the checks after it.
  let result: Result;
  try {
    result = run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    result = { status: "fail", lines: [`FAIL  could not run: ${reason}`] };
  }
  const { status, lines } = result;
  console.log(`${title}: ${status}`);
  for (const line of lines) console.log(`  ${line}`);
  if (status === "fail") failures++;
}
if (failures > 0) {
  console.error(`\n${failures} of ${checks.length} workspace checks failed.`);
  process.exit(1);
}
