// `pnpm dev` (T15): `turbo run dev`, started so that one Ctrl-C stops it on Windows too (W2, finding
// 1; `lib/dev-env.ts` says why). Run with plain `node scripts/dev.ts`; extra arguments go to turbo
// (`pnpm dev --filter @shopblok/storefront`).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { constants } from "node:os";
import { devEnvironment } from "./lib/dev-env.ts";

// turbo's launcher, the file `node_modules/.bin/turbo` starts. On Windows it takes the Ctrl-C from
// the terminal and has turbo pass it on to each task.
const turbo = createRequire(import.meta.url).resolve("turbo");
const child = spawn(process.execPath, [turbo, "run", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: devEnvironment({ ...process.env }),
});

// A Ctrl-C reaches turbo as well as this process (the whole console on Windows, the foreground
// process group elsewhere), and turbo stops the tasks: this waits for it rather than leave first.
// Passing it on would be turbo's second Ctrl-C, which kills the tasks instead.
process.on("SIGINT", () => {});
// A SIGTERM (`kill`, a process manager) is sent to this process alone: pass it on.
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("error", (error) => {
  console.error(`pnpm dev: could not start turbo (${error.message})`);
  process.exit(1);
});
// Ended by a signal: 128 + its number, as a shell reports it (130 for SIGINT, 143 for SIGTERM).
child.on("exit", (code, signal) =>
  process.exit(code ?? (signal === null ? 1 : 128 + (constants.signals[signal] ?? 0))),
);
