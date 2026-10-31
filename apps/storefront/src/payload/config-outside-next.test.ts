import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

// D95: `payload.config.ts` has to load in a plain Node process, outside Next: `payload
// generate:types`, `payload migrate`, `payload migrate:create` and `payload run` load it that way
// (through tsx, as the Payload CLI does). `lib/markets/get-market-map.ts` imports `server-only`,
// which throws there, so the config must reach the market map only through a lazy import
// (`payload/market-map.ts`). A static import anywhere on the config's import graph fails the first
// test below; Vitest cannot catch it itself, because it aliases `server-only` to an empty module.

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The same `tsx` the Payload CLI loads the config with, found through `payload`.
const requireFromPayload = createRequire(
  path.join(realpathSync(path.join(root, "node_modules", "payload")), "package.json"),
);
const tsxApi = pathToFileURL(requireFromPayload.resolve("tsx/esm/api")).href;

/** Runs a script that has the config loaded; its one line of JSON is the result. */
async function inPlainNode<T>(body: string): Promise<T> {
  const script = `
    import { tsImport } from ${JSON.stringify(tsxApi)};
    const loaded = await tsImport("./src/payload.config.ts", ${JSON.stringify(pathToFileURL(`${root}/`).href)});
    const config = await loaded.default;
    ${body}
  `;
  const { stdout } = await run(process.execPath, ["--input-type=module", "-e", script], {
    cwd: root,
    // No Medusa to ask: the read of the map must fail here, and the filter must still answer.
    env: {
      ...process.env,
      NODE_ENV: "test",
      PAYLOAD_SECRET: "test-secret",
      MEDUSA_BACKEND_URL: "http://127.0.0.1:1",
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_test",
    },
    timeout: 90_000,
  });
  const line = stdout.trim().split("\n").at(-1) ?? "";
  return JSON.parse(line) as T;
}

describe("payload.config.ts outside Next (D95)", () => {
  it("loads in a plain Node process, with no market map and no Medusa SDK on its import graph", async () => {
    const result = await inPlainNode<{ slug: string[]; globals: string[] }>(`
      console.log(JSON.stringify({
        slug: config.collections.map((collection) => collection.slug),
        globals: config.globals.map((global) => global.slug),
      }));
    `);
    expect(result.slug).toContain("pages");
    // The markets global is gone (D95): the map is Medusa's.
    expect(result.globals).not.toContain("markets");
    expect(result.globals).toEqual(expect.arrayContaining(["header", "footer", "site-settings"]));
  }, 120_000);

  it("filterAvailableLocales never throws: with the map unreadable it offers the default locale and warns", async () => {
    const result = await inPlainNode<{ codes: string[]; warnings: string[] }>(`
      const warnings = [];
      const req = { payload: { logger: { warn: (message) => warnings.push(String(message)) } } };
      const { filterAvailableLocales, locales } = config.localization;
      const offered = await filterAvailableLocales({ locales, req });
      console.log(JSON.stringify({ codes: offered.map((locale) => locale.code), warnings }));
    `);
    expect(result.codes).toEqual(["en"]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/market map could not be read.*default locale only/);
  }, 120_000);
});
