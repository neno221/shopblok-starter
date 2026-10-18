// `pnpm thumbnails` (T40, D52): writes the 21 thumbnails, `apps/storefront/public/registry/{id}.png`,
// by running the `thumbnails` Playwright project against a storefront that is up (built with
// DESIGN_SYSTEM_ENABLED=true and started with `next start`; SETUP.md, "Baselines and thumbnails
// (T40)"). The flag is set here and not in the package script because `VAR=value command` is not
// portable to Windows' shells. Only Playwright's container makes the committed ones (D51): run it
// there, or let the `update-baselines` input of CI do it. Extra arguments go to Playwright.
import { spawnSync } from "node:child_process";

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
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, E2E_DESIGN_SYSTEM: "true" },
    shell: process.platform === "win32",
  },
);
process.exit(result.status ?? 1);
