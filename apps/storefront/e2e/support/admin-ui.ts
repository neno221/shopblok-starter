import type { Page } from "@playwright/test";
import { adminCredentials, type Credentials } from "./admin-credentials";

/** Signs in to Payload's admin through its login form; the bootstrap admin unless told otherwise. */
export async function signInToAdmin(page: Page, credentials: Credentials = adminCredentials()) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.getByRole("button", { name: /^log in$|^login$/i }).click();
  await page.waitForURL(/\/admin\/?$/);
}
