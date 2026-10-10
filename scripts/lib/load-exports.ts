// Reading the exports of a TypeScript file that `scripts/` may not import (T14). `tsc` refuses the
// backend's `config/markets.ts` (TS1287: its package is CommonJS to TypeScript, T13 item 6), and Node
// prints a `MODULE_TYPELESS_PACKAGE_JSON` warning when it reparses the file as a module. A child
// process loads the file the way Node does, keeps that warning on its own (captured) stderr, and hands
// the data back as JSON, so the file is read as it really is and nothing is evaluated in doctor itself.
import { pathToFileURL } from "node:url";
import { run } from "./exec.ts";
import { extractMarker } from "./output.ts";

// The loader prints one line of JSON under this name; Node's own messages can share the stream.
const MARKER = "loadExports";

const LOADER = `
const [file, ...names] = process.argv.slice(1);
const module = await import(file);
const picked = {};
for (const name of names) picked[name] = module[name];
console.log(JSON.stringify({ ${MARKER}: picked }));
`;

/** The named exports of `file` (JSON-safe values only), or the reason it could not be read. */
export async function loadExports(
  file: string,
  names: readonly string[],
): Promise<{ exports: Record<string, unknown> } | { error: string }> {
  const result = await run(
    process.execPath,
    ["--input-type=module", "--eval", LOADER, pathToFileURL(file).href, ...names],
    { timeoutMs: 20_000 },
  );
  const picked = extractMarker<Record<string, unknown>>(result.output, MARKER);
  if (result.code === 0 && picked !== undefined) return { exports: picked };

  return { error: result.error ?? reasonOf(result.output) ?? `exit code ${result.code}` };
}

/**
 * Why a Node process died, from its stderr: the `Error: message` line of an uncaught exception, else
 * the last line that is not a stack frame or Node's trailing `Node.js v22.x` banner.
 */
function reasonOf(output: string): string | undefined {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("at ") && !/^Node\.js v\d/.test(line));
  return lines.findLast((line) => /^[A-Za-z]*Error\b/.test(line)) ?? lines.at(-1);
}
