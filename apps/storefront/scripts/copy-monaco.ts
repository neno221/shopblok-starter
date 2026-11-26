// M7 D141 (T107): copies Monaco's browser build (`monaco-editor/min/vs`, about 16 MB) into
// `public/vendor/monaco/<version>/vs`, so the admin's code editor loads it from the shop's own
// origin (`src/payload/admin/monaco-provider.tsx`) and no policy names `cdn.jsdelivr.net`. Runs
// before `next build` and `next dev` (package.json's `build` and `dev`, and `vercel-build.sh`); the
// folder is git-ignored (`public/vendor/`). Older versions' folders are removed, so a bump leaves one.
//
//   node scripts/copy-monaco.ts
//
// Fails (exit 1) when the installed `monaco-editor` is not the version `@monaco-editor/loader` asks
// jsdelivr for (its `config/index.js`): the loader's AMD paths are written for that build.
// `src/payload/admin/monaco-path.ts` names the same version for the provider (`monaco-path.test.ts`
// holds the three together); this script reads none of the app's source, so Node runs it as it is.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(app, "package.json"));

export function monacoSource(): { dir: string; version: string } {
  const manifest = require.resolve("monaco-editor/package.json");
  const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version: string };
  return { dir: join(dirname(manifest), "min", "vs"), version };
}

/** The version in `@monaco-editor/loader`'s default path (`…/monaco-editor@0.55.1/min/vs`). */
export function loaderVersion(): string {
  const entry = require.resolve("@monaco-editor/loader");
  const config = readFileSync(join(dirname(entry), "..", "es", "config", "index.js"), "utf8");
  const found = /monaco-editor@([0-9][^/'"]*)\/min\/vs/.exec(config)?.[1];
  if (found === undefined)
    throw new Error("copy-monaco: no monaco-editor version in @monaco-editor/loader's config");
  return found;
}

export function copyMonaco(): { target: string; files: number; skipped: boolean } {
  const source = monacoSource();
  const wanted = loaderVersion();
  if (source.version !== wanted) {
    throw new Error(
      `copy-monaco: monaco-editor ${source.version} is installed, @monaco-editor/loader expects ${wanted} (pin that in package.json and in src/payload/admin/monaco-path.ts)`,
    );
  }
  const versions = join(app, "public", "vendor", "monaco");
  const target = join(versions, wanted, "vs");
  if (existsSync(versions)) {
    for (const entry of readdirSync(versions)) {
      if (entry !== wanted) rmSync(join(versions, entry), { recursive: true, force: true });
    }
  }
  const sourceFiles = count(source.dir);
  // A complete copy from an earlier run is kept: the files of one version never change.
  if (existsSync(join(target, "loader.js")) && count(target) === sourceFiles) {
    return { target, files: sourceFiles, skipped: true };
  }
  rmSync(target, { recursive: true, force: true });
  cpSync(source.dir, target, { recursive: true });
  return { target, files: count(target), skipped: false };
}

function count(dir: string): number {
  let files = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    files += statSync(path).isDirectory() ? count(path) : 1;
  }
  return files;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { target, files, skipped } = copyMonaco();
    const where = target.slice(app.length);
    console.log(
      skipped
        ? `copy-monaco: ${where} is up to date (${files} files)`
        : `copy-monaco: ${files} files to ${where}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
