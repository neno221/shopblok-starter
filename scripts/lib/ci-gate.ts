// The CI gate (M2 plan, D53; T27): which of `e2e-smoke`, `design-system` and `windows-smoke` a run
// of `.github/workflows/ci.yml` needs. `check` and `backend-integration` always run. On a pull
// request the answer comes from the files it changes; any other event (a push to `main`, the
// weekly schedule, a dispatch) runs `e2e-smoke` and `design-system`, and `windows-smoke` on every
// event but a push (its rule since T16). `scripts/ci-gate.ts` reads the PR's files and the
// checkout, and writes the answer for the workflow. Nothing here reads a file or the network.
import path from "node:path";

/** The three jobs the gate decides. */
export type Jobs = { e2e: boolean; designSystem: boolean; windows: boolean };

/** The decision, with one line per job that says why. */
export type Decision = Jobs & { reasons: string[] };

/** A file that imports a module at run time, as `runtimeImports` finds it. */
export type Importer = { file: string; specifier: string };

/**
 * A folder or a file that only the design-system page uses. `importedAs` is the package specifier
 * other code would import it by; a relative import that resolves into `path` counts too.
 */
type DesignSystemArea = { path: string; importedAs?: RegExp };

/**
 * The design system's own files (D53's first list). A PR made only of these and of docs skips
 * `e2e-smoke`, because nothing the storefront serves outside `/design-system` imports them. The
 * `packages/` ones stop being DS-only as soon as a file outside these areas imports them (M3's
 * pages will): `decideJobs` is given the importers, and an imported area counts as shared.
 */
export const designSystemOnly: readonly DesignSystemArea[] = [
  // The registry (D40): entries and contracts. M4's Payload config is its first importer outside.
  { path: "packages/registry/", importedAs: /^@shopblok\/registry(\/|$)/ },
  // D42's three folders. The atoms are not here: the storefront's pages use them already.
  { path: "packages/ui/src/primitives/", importedAs: /^@shopblok\/ui\/primitives(\/|$)/ },
  { path: "packages/ui/src/molecules/", importedAs: /^@shopblok\/ui\/molecules(\/|$)/ },
  { path: "packages/ui/src/organisms/", importedAs: /^@shopblok\/ui\/organisms(\/|$)/ },
  // The DS page's stories, shell and routes (T22).
  { path: "apps/storefront/src/design-system/" },
  { path: "apps/storefront/src/app/design-system/" },
  // The DS checks (T24), the DS pages in `next dev` (T27) and, from T40, their baselines.
  { path: "apps/storefront/e2e/design-system.spec.ts" },
  { path: "apps/storefront/e2e/dev-console-ds.spec.ts" },
  { path: "apps/storefront/e2e/__screenshots__/" },
];

/**
 * Files the DS pages cannot reach (D53's second list). `design-system` is skipped only when every
 * changed file is docs or on this list; a file on no list runs it, so a new folder is checked until
 * someone adds it here. A string ending in `/` is a folder.
 */
const designSystemUnaffected: readonly (string | RegExp)[] = [
  // The backend, and the stack it runs on.
  "apps/backend/",
  "infra/",
  "compose.yaml",
  // The storefront's own routes: the market pages, Payload's admin and API, and `/next/*`.
  "apps/storefront/src/app/(storefront)/",
  "apps/storefront/src/app/(payload)/",
  "apps/storefront/src/app/next/",
  // Payload: its config, collections, generated types and migrations, and the bootstrap scripts.
  "apps/storefront/src/payload/",
  "apps/storefront/src/payload.config.ts",
  "apps/storefront/src/payload-types.ts",
  "apps/storefront/src/migrations/",
  "apps/storefront/src/scripts/",
  // The other suites' specs; the DS's own are DS-only files and run it.
  /^apps\/storefront\/e2e\/[^/]+\.spec\.ts$/,
  // Unit tests and their helpers, which `check` runs; the DS's own are DS-only files.
  /\.test\.(?:ts|tsx|mts|js|mjs)$/,
  "apps/storefront/src/test-support/",
  "apps/storefront/vitest.config.ts",
  // Settings that `check` reads and `next build` does not.
  "apps/storefront/eslint.config.mjs",
  "apps/storefront/components.json",
  "apps/storefront/.env.example",
  ".editorconfig",
  ".gitignore",
  "renovate.json",
  // The root scripts (bootstrap, doctor, the token export), but not this gate.
  /^scripts\/(?!ci-gate\.ts$|lib\/ci-gate\.)/,
];

/** A dependency changed: every job runs, `windows-smoke` included (its rule since T16). */
export function isDependencyFile(file: string): boolean {
  return (
    path.posix.basename(file) === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml"
  );
}

/** Text that no build, server or test reads: the docs folder, and Markdown anywhere. */
export function isDocs(file: string): boolean {
  return file.startsWith("docs/") || file.endsWith(".md");
}

function within(file: string, area: string | RegExp): boolean {
  if (typeof area !== "string") return area.test(file);
  return area.endsWith("/") ? file.startsWith(area) : file === area;
}

function areaOf(file: string): DesignSystemArea | undefined {
  return designSystemOnly.find((area) => within(file, area.path));
}

/** Whether a file is in one of the DS-only areas. */
export function inDesignSystemArea(file: string): boolean {
  return areaOf(file) !== undefined;
}

/** Whether `importer` reaches into `area`, by its package specifier or by a relative path. */
function imports(importer: Importer, area: DesignSystemArea): boolean {
  if (area.importedAs?.test(importer.specifier)) return true;
  if (!importer.specifier.startsWith(".")) return false;
  const target = path.posix.join(path.posix.dirname(importer.file), importer.specifier);
  return within(target, area.path) || within(`${target}/`, area.path);
}

/**
 * The DS-only areas that code outside them imports, so that a change in them can reach a page
 * `e2e-smoke` checks. An importer inside a DS-only area is not counted: the DS importing itself
 * changes nothing.
 */
export function sharedAreas(importers: readonly Importer[]): string[] {
  const outside = importers.filter((importer) => areaOf(importer.file) === undefined);
  return designSystemOnly
    .filter((area) => outside.some((importer) => imports(importer, area)))
    .map((area) => area.path);
}

/**
 * The jobs a run needs. `files` are the PR's changed files (both names of a rename), relative to
 * the repo root; `importers` are the files outside the DS-only areas that import something at run
 * time (`runtimeImports`). Both are ignored for any event but `pull_request`.
 */
export function decideJobs(input: {
  event: string;
  files: readonly string[];
  importers?: readonly Importer[];
}): Decision {
  const { event, files } = input;
  if (event !== "pull_request") {
    // windows-smoke keeps T16's rule (D53): a push to `main` merged a PR, which ran it if it
    // changed a dependency file, and Windows minutes cost double. The schedule, a dispatch and any
    // event this file does not know run it.
    const windows = event !== "push";
    return {
      e2e: true,
      designSystem: true,
      windows,
      reasons: [
        `${event}: e2e-smoke and design-system run (only a pull request is gated)`,
        windows
          ? "windows-smoke: runs (every event but a push and a pull request)"
          : "windows-smoke: skipped (a push: the pull request ran it if it changed a dependency file)",
      ],
    };
  }
  if (files.length === 0) {
    // A PR the API lists no file for (none changed, or the list failed to arrive) is not proof
    // that nothing needs checking.
    return {
      e2e: true,
      designSystem: true,
      windows: true,
      reasons: ["pull_request: no changed files were listed, so every job runs"],
    };
  }
  const shared = sharedAreas(input.importers ?? []);
  const dsOnly = (file: string): boolean => {
    const area = areaOf(file);
    return area !== undefined && !shared.includes(area.path);
  };

  const dependency = files.find(isDependencyFile);
  // A dependency file runs everything, even one inside a DS-only folder (the registry's
  // package.json): a new version reaches every package that resolves it.
  const e2eFile = dependency ?? files.find((file) => !isDocs(file) && !dsOnly(file));
  const dsFile =
    dependency ??
    files.find(
      (file) =>
        areaOf(file) !== undefined ||
        (!isDocs(file) && !designSystemUnaffected.some((area) => within(file, area))),
    );

  const reasons: string[] = [];
  if (shared.length > 0) {
    reasons.push(`shared, because code outside the DS imports them: ${shared.join(", ")}`);
  }
  reasons.push(
    e2eFile === undefined
      ? "e2e-smoke: skipped (every file is docs or the design system's own)"
      : e2eFile === dependency
        ? `e2e-smoke: runs (${e2eFile}, a dependency file)`
        : `e2e-smoke: runs (${e2eFile} is neither docs nor the design system's own)`,
    dsFile === undefined
      ? "design-system: skipped (every file is docs or one the DS pages cannot reach)"
      : `design-system: runs (${dsFile})`,
    dependency === undefined
      ? "windows-smoke: skipped (no dependency file)"
      : `windows-smoke: runs (${dependency})`,
  );
  return {
    e2e: e2eFile !== undefined,
    designSystem: dsFile !== undefined,
    windows: dependency !== undefined,
    reasons,
  };
}

// `import … from "x"`, `import "x"`, `export … from "x"`, `import("x")` and `require("x")`. A
// statement that starts `import type` or `export type` is left out: TypeScript erases it. Other
// mentions (a comment that quotes an import) count, which can only make the gate run more.
const staticImport = /\b(import|export)\s+(type\s+)?(?:[^'"`;]*?\bfrom\s*)?["']([^"']+)["']/g;
const dynamicImport = /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;

/** The module specifiers a source file imports at run time. */
export function runtimeImports(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(staticImport)) {
    if (match[2] === undefined && match[3] !== undefined) found.add(match[3]);
  }
  for (const match of source.matchAll(dynamicImport)) {
    if (match[1] !== undefined) found.add(match[1]);
  }
  return [...found];
}

/** The workflow's outputs, as `$GITHUB_OUTPUT` lines. */
export function outputLines(jobs: Jobs): string[] {
  return [`e2e=${jobs.e2e}`, `design-system=${jobs.designSystem}`, `windows=${jobs.windows}`];
}
