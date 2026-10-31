import type { Page } from "@playwright/test";
import { adminCredentials, type Credentials } from "./admin-credentials";

/**
 * Signs in to Medusa Admin (`{medusa}/app`) through its login form as the bootstrap admin (T74).
 * `page` has the Medusa origin as its `baseURL`, or `medusa` is the origin. The form's inputs have
 * no label, so they are found by name; it waits for the page the login leads to, not for the URL
 * pattern `/app`, which `/app/login` matches too.
 */
export async function signInToMedusaAdmin(
  page: Page,
  medusa: string,
  credentials: Credentials = adminCredentials(),
) {
  await page.goto(`${medusa}/app/login`);
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

/** Signs in to Payload's admin through its login form; the bootstrap admin unless told otherwise. */
export async function signInToAdmin(page: Page, credentials: Credentials = adminCredentials()) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
}
