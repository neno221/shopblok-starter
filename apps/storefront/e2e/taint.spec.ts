import { appEnv } from "./support/app-env";
// M6 D114 (T93): fails a test on any request to a third party an integration talks to.
import { expect, test } from "./support/third-party";

// M7 (SPEC §11.1): React's taint guard is on (`experimental.taint`, `lib/security/taint.ts`). The
// test page `/[market]/e2e-taint` (`E2E_TEST_ROUTES=true`) hands a value to a Client Component: a
// server secret read through `lib/env.ts` must fail on the server, so the visitor gets the market's
// error page and the answer holds no byte of the secret; a plain string renders. The signed-in
// customer's half is in `auth.spec.ts`, which has the customer.
const PATH = "/us/e2e-taint";

test("a server secret handed to a Client Component is refused on the server, and never sent", async ({
  page,
}) => {
  const secret = appEnv("storefront", "STOREFRONT_SIGNING_SECRET");
  expect(secret.length).toBeGreaterThanOrEqual(16);
  const response = await page.goto(`${PATH}?leak=secret`);
  expect(await response?.text()).not.toContain(secret);
  await expect(page.locator('[data-slot="error-template"]')).toBeVisible();
  await expect(page.getByTestId("taint-probe")).toHaveCount(0);
  expect(await page.content()).not.toContain(secret);
});

test("a plain value renders (the page itself works)", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByTestId("taint-probe")).toHaveText("nothing tainted");
  await expect(page.locator('[data-slot="error-template"]')).toHaveCount(0);
});
