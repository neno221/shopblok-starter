// `pnpm dev` for the markets plugin (T73, D89): `medusa plugin:develop` (rebuilds `.medusa/server`
// when a source file changes) plus the one thing it lacks in this monorepo: telling the backend.
//
// Measured (SETUP.md, "The markets plugin (T73)"): the backend's `medusa develop` watches its own
// files only, so a rebuilt plugin is not picked up until the backend restarts; and `plugin:develop`
// starts with a clean of `.medusa/server`, which the backend may be loading at that moment (Medusa
// skips a plugin's modules without a word when the folder is missing). So after the first build and
// after every rebuild this touches the backend's `medusa-config.ts`, which `medusa develop` watches
// and restarts on. `plugin:develop` also tries `yalc publish`, which refuses a `private` package
// ("Will not publish package with `private: true`"): nothing is published and `workspace:*` stays.
import { spawn } from "node:child_process";
import { existsSync, utimesSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const pluginDir = path.resolve(import.meta.dirname, "..");
const trigger = path.resolve(pluginDir, "../../apps/backend/medusa-config.ts");

const medusa = path.join(pluginDir, "node_modules", "@medusajs", "cli", "cli.js");
const child = spawn(process.execPath, [medusa, "plugin:develop"], {
  cwd: pluginDir,
  stdio: ["inherit", "pipe", "inherit"],
});

let timer;
function restartBackend() {
  // Debounced: `plugin:develop` logs one line per file it rewrites.
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!existsSync(trigger)) return;
    const now = new Date();
    utimesSync(trigger, now, now);
    console.log("markets plugin rebuilt: asked the backend to restart (touched medusa-config.ts)");
  }, 500);
}

createInterface({ input: child.stdout }).on("line", (line) => {
  console.log(line);
  if (/watching for file changes|Republishing changes|removed: Republishing/.test(line)) {
    restartBackend();
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
