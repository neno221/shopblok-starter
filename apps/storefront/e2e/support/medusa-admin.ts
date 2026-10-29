import { expect } from "@playwright/test";
import { adminCredentials } from "./admin-credentials";
import { appEnv } from "./app-env";

// Medusa's Admin API from Node as the bootstrap admin (T60's sync.spec.ts, T71's markets-add): its
// origin, a login, and a JSON call that fails the test unless it is a 2xx.

/** Medusa's origin, as the storefront reaches it. */
export function medusaUrl(): string {
  try {
    return appEnv("storefront", "MEDUSA_BACKEND_URL").replace(/\/$/, "");
  } catch {
    return "http://localhost:9000";
  }
}

/** A token for the bootstrap admin (emailpass); a refused login fails here, not as a later 401. */
export async function medusaAdminToken(medusa: string = medusaUrl()): Promise<string> {
  const { email, password } = adminCredentials();
  const response = await fetch(`${medusa}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(response.status, `Medusa's admin login: ${await response.clone().text()}`).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

/** A JSON call to Medusa's Admin API with `token`; fails the test unless it answers a 2xx. */
export async function medusaAdminApi<T = Record<string, unknown>>(
  medusa: string,
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${medusa}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  expect(response.status, `${method} ${path}: ${await response.clone().text()}`).toBeLessThan(300);
  return (await response.json()) as T;
}
