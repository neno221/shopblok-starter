// `pnpm thumbnails` (T40, D52): writes the 29 thumbnails, `apps/storefront/public/registry/{id}.png`,
// by running the `thumbnails` Playwright project against a storefront that is up (built with
// DESIGN_SYSTEM_ENABLED=true and started with `next start`; SETUP.md, "Baselines and thumbnails
// (T40)"). The flag is set here and not in the package script because `VAR=value command` is not
// portable to Windows' shells. Only Playwright's container makes the committed ones (D51): run it
// there, or let the `update-baselines` input of CI do it. Outside the image (whose
// PLAYWRIGHT_BROWSERS_PATH is /ms-playwright) it refuses unless given `--host`, so a host run does
// not replace the set with host pixels (PR 63 review). Extra arguments go to Playwright.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const host = args.includes("--host");
if (!host && process.env["PLAYWRIGHT_BROWSERS_PATH"] !== "/ms-playwright") {
  console.error(
    "pnpm thumbnails writes the committed thumbnails, which only Playwright's image makes (D51).\n" +
      "Run it in mcr.microsoft.com/playwright:v1.64.0-noble (SETUP.md, 'Baselines and thumbnails (T40)'),\n" +
      "dispatch CI with update-baselines, or pass --host to write host pixels you will not commit.",
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@shopblok/storefront",
    "exec",
    "playwright",
    "test",
    "--project=thumbnails",
    "--update-snapshots=changed",
    ...args.filter((arg) => arg !== "--host"),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, E2E_DESIGN_SYSTEM: "true" },
    shell: process.platform === "win32",
  },
);
process.exit(result.status ?? 1);
