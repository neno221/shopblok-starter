import { defineConfig, devices, type Project } from "@playwright/test";

// The suites run against a storefront that is already up: `next build && next start -p 8000`, with
// the `markets` global filled (production has no fallback; SETUP.md, "Markets library (T10)").
// Nothing here starts it, so the same specs can run in CI (T16), where bootstrap does the filling.
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
//                   DESIGN_SYSTEM_ENABLED=true; no backend.
// A browser that is not the one `playwright install` fetched (the cloud VM's, CLOUD.md), for the
// `design-system` project. Unset in CI.
const chromiumPath = process.env["PW_CHROMIUM_PATH"];

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
    flag: "E2E_DESIGN_SYSTEM",
    // The cells read static pages and log in to nothing, so they take two workers (CI's runner has
    // two cores).
    workers: 2,
    projects: [
      {
        name: "design-system",
        retries: 0,
        use: {
          ...devices["Desktop Chrome"],
          ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
          // D50 (set in T35, the first entry that moves by itself: AnnouncementBar's rotation): the
          // cells run as a reader who prefers reduced motion, so nothing changes between one run's
          // picture and the next.
          contextOptions: { reducedMotion: "reduce" },
        },
        testMatch: /design-system\.spec\.ts/,
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
    testIgnore: [/payload-locales\.spec\.ts/, ...optInSpecs],
  },
  // Saves the `markets` global (and puts it back), which the other suites read through the proxy:
  // it runs when all of them are done.
  {
    name: "locales",
    use: { ...devices["Desktop Chrome"] },
    testMatch: /payload-locales\.spec\.ts/,
    dependencies: ["chromium"],
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // One worker for the default run, so the specs run one after the other. The admin specs all log
  // in as the admin bootstrap made, and Payload keeps a user's sessions in one array on the user
  // document: two logins at the same moment overwrite each other, and the JWT of the session that
  // lost is refused with 403 (seen in T17: `payload-cache` and `payload-admin` starting together).
  workers: active[0]?.workers ?? 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8000",
    trace: "retain-on-failure",
  },
  projects: active[0]?.projects ?? defaultProjects,
});
