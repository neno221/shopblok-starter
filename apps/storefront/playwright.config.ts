import { defineConfig, devices, type Project } from "@playwright/test";

// The suites run against a storefront that is already up: `next build && next start -p 8000`, with
// Medusa's market map seeded (production has no fallback; SETUP.md, "Markets library (T10)").
// Nothing here starts it, so the same specs can run in CI (T16), where bootstrap does the seeding.
// Build fresh before a run that changes the map: `next start` can serve a page from an earlier
// map after a restart (SETUP.md, "After a restart").
// The opt-in projects (PR 44 review, items 6 and 10; T27). Each runs against a server the default
// projects don't use, so it exists only when its flag is `true`, and its flag replaces the default
// run: `E2E_DESIGN_SYSTEM=true playwright test --project=design-system`. Set a flag per command,
// not exported in a shell. A new opt-in project is one row; the default projects ignore every
// opt-in spec, so the default run stays what it was.
//   dev-console     (T25, D37) the storefront's own routes in `next dev`; e2e-smoke's last step.
//   dev-console-ds  (T27) the DS pages in `next dev`; the design-system job's last step.
//   design-system   (T24, D34) every DS cell against `next start` built with
//                   DESIGN_SYSTEM_ENABLED=true; no backend. T40 (D51): each `en` cell is also a
//                   pixel comparison against a committed baseline (`el` keeps the other checks).
//   thumbnails      (T40, D52) the previews of the 21 family entries at 1200 × 800 at half scale,
//                   compared with (or, on an update, written as) `public/registry/{id}.png`. It
//                   runs against the same server as `design-system`, so the one flag enables both.
//   outage          (T42, D67) ADR 0004's outage test against the `next start` and Medusa that e2e-smoke
//                   has up: `outage.spec.ts` stops Medusa by the PID file `start-medusa` wrote
//                   (`E2E_MEDUSA_PID`, e2e/support/medusa-process.ts) and measures the pages;
//                   `outage-recovery.spec.ts` runs after the workflow has started Medusa again, through
//                   the same action. One project for both: the command line names the spec, and the
//                   specs are not run together (the first leaves Medusa down). T49 writes them.
// A browser that is not the one `playwright install` fetched (the cloud VM's, CLOUD.md), for the
// `design-system` project. Unset in CI.
const chromiumPath = process.env["PW_CHROMIUM_PATH"];
const launchOptions = chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {};

// `next dev` compiles each route on its first visit, so the dev-console projects keep one worker,
// and their one retry is for a browser that stalls on a runner (CI run 38876631305): a console
// message is the same on the second visit, so a real finding still fails twice.
const devConsoleProject = (name: string, spec: RegExp): Project => ({
  name,
  retries: 1,
  use: { ...devices["Desktop Chrome"] },
  testMatch: spec,
});

type OptIn = { flag: string; workers: number; projects: Project[] };
const optIns: OptIn[] = [
  {
    flag: "E2E_DEV_CONSOLE",
    workers: 1,
    projects: [
      devConsoleProject("dev-console", /dev-console\.spec\.ts/),
      devConsoleProject("dev-console-ds", /dev-console-ds\.spec\.ts/),
    ],
  },
  {
    flag: "E2E_OUTAGE",
    // One worker, no retry: the spec stops a server, and a second run would find it already down.
    workers: 1,
    projects: [
      {
        name: "outage",
        retries: 0,
        use: { ...devices["Desktop Chrome"] },
        testMatch: /outage(?:-recovery)?\.spec\.ts$/,
      },
    ],
  },
  {
    flag: "E2E_DESIGN_SYSTEM",
    // The cells read static pages and log in to nothing, so they take two workers (CI's runner has
    // two cores).
    workers: 2,
    projects: [
      {
        name: "design-system",
        retries: 0,
        // D51: no platform suffix, because only Playwright's container makes baselines. The cell
        // names its file: `design-system/{id}/{locale}-{width}.png`.
        snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
        use: {
          ...devices["Desktop Chrome"],
          ...launchOptions,
          // D50 (set in T35, the first entry that moves by itself: AnnouncementBar's rotation): the
          // cells run as a reader who prefers reduced motion, so nothing changes between one run's
          // picture and the next.
          contextOptions: { reducedMotion: "reduce" },
        },
        testMatch: /design-system\.spec\.ts/,
      },
      {
        name: "thumbnails",
        retries: 0,
        // D52: the thumbnail is the preview's baseline, in `public/` where Next serves it as
        // `/registry/{id}.png` and the registry points to it.
        snapshotPathTemplate: "{testDir}/../public/registry/{arg}{ext}",
        use: {
          ...devices["Desktop Chrome"],
          ...launchOptions,
          viewport: { width: 1200, height: 800 },
          // Half scale: with `scale: "device"` in the spec the capture is 600 × 400 px.
          deviceScaleFactor: 0.5,
          contextOptions: { reducedMotion: "reduce" },
        },
        testMatch: /thumbnails\.spec\.ts/,
      },
    ],
  },
];

const active = optIns.filter((optIn) => process.env[optIn.flag] === "true");
// Each flag replaces the default projects, so two at once would run neither as asked.
if (active.length > 1) {
  throw new Error(
    `${active.map((optIn) => optIn.flag).join(" and ")} are set together: set only one, per command.`,
  );
}
const optInSpecs = optIns.flatMap((optIn) =>
  optIn.projects.flatMap((project) =>
    project.testMatch instanceof RegExp ? [project.testMatch] : [],
  ),
);

const defaultProjects: Project[] = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    testIgnore: [
      /payload-locales\.spec\.ts/,
      /ui-strings\.spec\.ts/,
      /markets-add\.spec\.ts/,
      /market-panels\.spec\.ts/,
      ...optInSpecs,
    ],
  },
  // Open a language in Medusa's markets (and close it again), which the other suites read through
  // the proxy: they run when all of them are done. `ui-strings.spec.ts` (T62) also edits the home's copy.
  {
    name: "locales",
    use: { ...devices["Desktop Chrome"] },
    testMatch: /(payload-locales|ui-strings)\.spec\.ts/,
    dependencies: ["chromium"],
  },
  // T71, the done-when of M4b (D97, T76): adds a market in Medusa Admin, in the browser (Austria in
  // Medusa's own region form, then switched on in the region page's Markets panel) and takes it
  // away again, so it runs after every suite that reads the map, the locales' included.
  // `PW_CHROMIUM_PATH` as for `design-system`.
  {
    name: "markets-add",
    use: { ...devices["Desktop Chrome"], ...launchOptions },
    testMatch: /markets-add\.spec\.ts/,
    dependencies: ["locales"],
  },
  // T74 (M4b D93): the Markets panels on Medusa Admin's Region and Store pages. It talks to Medusa
  // only (no storefront), adds Austria to the Europe region, changes market rows and the fallback
  // market, and puts them back, so it runs after every suite that reads the map, `markets-add`
  // (which also changes the Europe region) included. `PW_CHROMIUM_PATH` as for `design-system`.
  {
    name: "market-panels",
    use: { ...devices["Desktop Chrome"], ...launchOptions },
    testMatch: /market-panels\.spec\.ts/,
    dependencies: ["markets-add"],
  },
];

export default defineConfig({
  testDir: "./e2e",
  // Only `*.spec.ts` are Playwright's. Playwright's default would also take `*.test.ts`, which are
  // Vitest's (the helpers under e2e/support, T42).
  testMatch: /\.spec\.ts$/,
  fullyParallel: true,
  // One worker for the default run, so the specs run one after the other. The admin specs all log
  // in as the admin bootstrap made, and Payload keeps a user's sessions in one array on the user
  // document: two logins at the same moment overwrite each other, and the JWT of the session that
  // lost is refused with 403 (seen in T17: `payload-cache` and `payload-admin` starting together).
  workers: active[0]?.workers ?? 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  // D51: Playwright's defaults for the comparison (per-pixel threshold 0.2, no differing pixel
  // allowed), with the two things that move spelled out. "none": a missing baseline fails the cell
  // and writes nothing. Playwright's own default ("missing" behaviour under "default") writes the
  // actual image as the baseline, so a run on a host would leave host pixels that the next run
  // passes against (PR 63 review). `--update-snapshots` on the command line still wins: the
  // update-baselines job and `pnpm thumbnails` pass it.
  updateSnapshots: "none",
  expect: { toHaveScreenshot: { animations: "disabled", caret: "hide" } },
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8000",
    trace: "retain-on-failure",
  },
  projects: active[0]?.projects ?? defaultProjects,
});
