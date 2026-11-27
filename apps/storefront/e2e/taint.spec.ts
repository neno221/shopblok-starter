import { TAINT_PROBE_VALUE } from "../src/lib/e2e/taint-probe";
// M6 D114 (T93): fails a test on any request to a third party an integration talks to.
import { expect, test } from "./support/third-party";

// SPEC §11.1: React's taint guard is on (`experimental.taint`, `lib/security/taint.ts`). The test
// page `/[market]/e2e-taint` (`E2E_TEST_ROUTES=true`) hands a value to a Client Component: a value
// tainted as `lib/env.ts` taints a server secret (`taintSecret`) must fail on the server, so the
// visitor gets the market's error page and the answer holds no byte of it; a plain string renders.
// The tainted value is made for the probe (`lib/e2e/taint-probe.ts`), never a real secret (PR 158
// review, item 1). The signed-in customer's half is in `auth.spec.ts`, which has the customer.
const PATH = "/us/e2e-taint";

test("a tainted secret handed to a Client Component is refused on the server, and never sent", async ({
  page,
}) => {
  const response = await page.goto(`${PATH}?leak=secret`);
  expect(await response?.text()).not.toContain(TAINT_PROBE_VALUE);
  await expect(page.locator('[data-slot="error-template"]')).toBeVisible();
  await expect(page.getByTestId("taint-probe")).toHaveCount(0);
  expect(await page.content()).not.toContain(TAINT_PROBE_VALUE);
});

test("a plain value renders (the page itself works)", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByTestId("taint-probe")).toHaveText("nothing tainted");
  await expect(page.locator('[data-slot="error-template"]')).toHaveCount(0);
});
