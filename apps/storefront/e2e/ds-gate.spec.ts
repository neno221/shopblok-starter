import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { signInToAdmin } from "./support/admin-ui";
import { appEnv } from "./support/app-env";
import { expect, test } from "./support/csp";
import { adminToken, base } from "./support/server";
import { payloadSigningKey } from "../src/lib/security/payload-token";

// M7 D148 (4), T111: the design system behind Payload's staff login, against a build with
// `DESIGN_SYSTEM_ENABLED=true` served by `next start` with `DEPLOY_ENV=staging` (e2e-smoke's last
// steps; locally: build with the flag, start with `DEPLOY_ENV=staging`, then
// `E2E_DS_GATE=true playwright test --project=ds-gate`). The proxy checks Payload's `payload-token`
// cookie without Payload (`lib/security/payload-token.ts`), so these sign in through Payload itself
// and send the cookie it set:
//
// - anonymous, the integrations user (its API key, and a token in its name signed with Payload's
//   key), an expired token and a tampered one: the 404 any unknown path gets, never stored;
// - an editor (Payload's REST sign-in, and the admin's own login form in a browser) and the
//   bootstrap admin: 200;
// - the DS pages are still prerendered (the build's prerender manifest), and a signed-out editor's
//   old cookie still passes until it expires, which D148 accepts (Payload's session id, `sid`,
//   lives in its database, which the proxy does not read).
//
// The plan's mutation, the role check in `verifyStaffToken` removed, lets the integration's token
// in, which "refuses the integrations user" catches.

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

const stamp = Date.now().toString(36);
const editorEmail = `ds-gate-editor-${stamp}@example.com`;
const editorPassword = `ds-gate-${stamp}-password`;
const PAGES = ["/design-system/en", "/design-system/el/foundations/colors"];

let admin = "";
let editorId: number | undefined;
let editorToken = "";

const get = (target: string, headers: Record<string, string> = {}) =>
  fetch(new URL(target, base()), { redirect: "manual", headers });
const withToken = (token: string) => ({ cookie: `payload-token=${token}` });
const json = { "content-type": "application/json" };

/** The `payload-token` cookie a sign-in's answer sets. */
function cookieToken(response: Response): string {
  const header = response.headers.getSetCookie().find((each) => each.startsWith("payload-token="));
  const token = header?.split(";")[0]?.slice("payload-token=".length) ?? "";
  expect(token, "Payload set its payload-token cookie").not.toBe("");
  return token;
}

/** A token with these claims, signed with the key Payload derives from this server's secret. */
function signed(claims: Record<string, unknown>, header: Record<string, unknown> = {}): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "HS256", authVersion: 1, typ: "JWT", ...header })}.${part(claims)}`;
  const signature = createHmac("sha256", payloadSigningKey(appEnv("storefront", "PAYLOAD_SECRET")))
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

/** Whether the answer is the gate's refusal: the 404 of any unknown path, never stored. */
async function refused(response: Response, what: string) {
  expect(response.status, what).toBe(404);
  expect(response.headers.get("cache-control") ?? "", what).toContain("no-store");
  const html = await response.text();
  expect(html, what).not.toContain("/design-system/en/foundations");
}

test.beforeAll(async () => {
  admin = await adminToken();
  const created = await fetch(`${base()}/api/users`, {
    method: "POST",
    headers: { ...json, Authorization: `JWT ${admin}` },
    body: JSON.stringify({ email: editorEmail, password: editorPassword, role: "editor" }),
  });
  expect(created.status, await created.clone().text()).toBe(201);
  editorId = ((await created.json()) as { doc: { id: number } }).doc.id;
});

test.afterAll(async () => {
  if (editorId !== undefined)
    await fetch(`${base()}/api/users/${editorId}`, {
      method: "DELETE",
      headers: { Authorization: `JWT ${admin}` },
    }).catch(() => undefined);
});

test("the server runs as a deployment with the DS built in", async () => {
  // The gate is on only on a deployment; without the flag the pages would be the build's 404 anyway.
  const answer = await get("/design-system/en", withToken(admin));
  expect(answer.status, "the bootstrap admin sees the DS").toBe(200);
  const anonymous = await get("/design-system/en");
  expect(anonymous.status, "is this server started with DEPLOY_ENV=staging?").toBe(404);
});

test("anonymous: the 404 of any unknown path, on every DS page", async () => {
  for (const page of [...PAGES, "/design-system/de/frame/atoms/button"]) {
    await refused(await get(page), page);
  }
  // The same page as a path that never existed: nothing tells the two apart but the status.
  const unknown = await get("/no-such-page-at-all");
  expect(unknown.status).toBe(404);
});

test("an editor signed in through Payload's REST API gets the pages", async () => {
  const login = await fetch(`${base()}/api/users/login`, {
    method: "POST",
    headers: { ...json, Origin: new URL(base()).origin },
    body: JSON.stringify({ email: editorEmail, password: editorPassword }),
  });
  expect(login.status, await login.clone().text()).toBe(200);
  editorToken = cookieToken(login);
  for (const page of PAGES) {
    const response = await get(page, withToken(editorToken));
    expect(response.status, page).toBe(200);
    expect(response.headers.get("cache-control") ?? "", page).toContain("no-store");
    expect(await response.text(), page).toContain("/design-system/");
  }
});

test("an editor signed in through the admin's login form opens the DS in the same browser", async ({
  page,
}) => {
  await signInToAdmin(page, { email: editorEmail, password: editorPassword });
  const response = await page.goto("/design-system/en");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
});

test("refuses the integrations user: its API key, and a token in its name with Payload's key", async () => {
  const key = appEnv("backend", "PAYLOAD_API_KEY");
  await refused(
    await get("/design-system/en", { Authorization: `integrations API-Key ${key}` }),
    "the API key",
  );
  const exp = Math.floor(Date.now() / 1000) + 600;
  const integration = signed({ id: 1, collection: "integrations", role: "medusa-sync", exp });
  await refused(await get("/design-system/en", withToken(integration)), "the integration's token");
});

test("refuses an expired token and a tampered one", async () => {
  const past = Math.floor(Date.now() / 1000) - 1;
  const expired = signed({ id: editorId, collection: "users", role: "editor", exp: past });
  await refused(await get("/design-system/en", withToken(expired)), "expired");
  const [header, claims, signature] = editorToken.split(".") as [string, string, string];
  const promoted = Buffer.from(
    JSON.stringify({
      ...(JSON.parse(Buffer.from(claims, "base64url").toString()) as object),
      role: "admin",
    }),
  ).toString("base64url");
  await refused(
    await get("/design-system/en", withToken(`${header}.${promoted}.${signature}`)),
    "tampered",
  );
  await refused(await get("/design-system/en", withToken(`${editorToken}x`)), "a bad signature");
});

test("the DS pages are still prerendered", async () => {
  const manifest = path.resolve(import.meta.dirname, "../.next/prerender-manifest.json");
  test.skip(!existsSync(manifest), "runs against this checkout's own build");
  const routes = Object.keys(
    (JSON.parse(readFileSync(manifest, "utf8")) as { routes: Record<string, unknown> }).routes,
  );
  for (const page of PAGES) expect(routes, page).toContain(page);
});

test("a signed-out editor keeps the DS until the token expires (accepted by D148)", async () => {
  const logout = await fetch(`${base()}/api/users/logout`, {
    method: "POST",
    headers: { Authorization: `JWT ${editorToken}`, Origin: new URL(base()).origin },
  });
  expect(logout.status, await logout.clone().text()).toBe(200);
  // Payload itself no longer takes the token (its session is gone)…
  const me = await fetch(`${base()}/api/users/me`, {
    headers: { Authorization: `JWT ${editorToken}` },
  });
  expect(((await me.json()) as { user: unknown }).user).toBeNull();
  // …but the proxy cannot see Payload's sessions, so the DS still answers.
  expect((await get("/design-system/en", withToken(editorToken))).status).toBe(200);
});
