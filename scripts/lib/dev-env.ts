// The environment `pnpm dev` gives turbo (`scripts/dev.ts`; W2, finding 1).
import path from "node:path";

/**
 * The environment for `turbo run dev`. On Windows, the folder of the pnpm that runs `pnpm dev` goes
 * first on PATH when that pnpm is a native `pnpm.exe`, which pnpm 12 is however it was installed
 * (pnpm names it in `npm_execpath`). turbo starts each task with the first `pnpm` it finds on PATH,
 * and with npm's global install that is the batch file `pnpm.cmd`: after a Ctrl-C, the cmd.exe that
 * runs it asks "Terminate batch job (Y/N)?" in a console nobody sees, and turbo waits for it for
 * ever. A task started as `pnpm.exe` ends with the first Ctrl-C. Anywhere else, and for a pnpm that
 * is not an `.exe`, the environment is returned as it is.
 */
export function devEnvironment(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  const pnpm = env.npm_execpath;
  if (platform !== "win32" || pnpm === undefined) return env;
  if (path.win32.basename(pnpm).toLowerCase() !== "pnpm.exe") return env;
  // Windows calls it `Path`, and a copy of the environment no longer ignores the case of a name.
  const key = Object.keys(env).find((name) => name.toUpperCase() === "PATH") ?? "Path";
  const folder = path.win32.dirname(pnpm);
  const current = env[key] ?? "";
  if (current.split(";")[0]?.toLowerCase() === folder.toLowerCase()) return env;
  return { ...env, [key]: current === "" ? folder : `${folder};${current}` };
}
