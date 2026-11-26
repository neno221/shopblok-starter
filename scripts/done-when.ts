// `node scripts/done-when.ts` (T103), in CI's `integrations-live` job only: says which integrations the
// job must find live, from the keys its environment holds (`lib/done-when.ts`), writes them to
// `E2E_EXPECT_LIVE` in `$GITHUB_ENV` for the steps after it, and fails when an integration is half
// set. It prints names and ids, never a value; a GitHub notice names the integrations that are not
// live (no secrets), so the run's summary says what it did not check.
import { appendFileSync } from "node:fs";
import { expectedLive } from "./lib/done-when.ts";

const result = expectedLive(process.env);
console.log(`Integrations (from the keys this job holds):\n${result.lines.join("\n")}`);
const githubEnv = process.env["GITHUB_ENV"];
if (githubEnv) appendFileSync(githubEnv, `E2E_EXPECT_LIVE=${result.expected.join(",")}\n`);
console.log(`E2E_EXPECT_LIVE=${result.expected.join(",")}`);
if (result.notLive.length > 0) {
  console.log(
    `::notice title=Not live in this run::${result.notLive.map((each) => each.id).join(", ")}: their secrets are not set, so they were checked on their fallback (M6 §4a, G10).`,
  );
}
for (const problem of result.problems)
  console.log(`::error title=Half-set integration::${problem}`);
process.exitCode = result.problems.length > 0 ? 1 : 0;
