import { expect, test, type APIResponse } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T11: the proxy turns public market URLs into the internal `/{key}/…` routes (SPEC §8.1, §8.5).
// Run against `next start` with the seeded map in Medusa's markets module (playwright.config.ts).

test.beforeAll(async ({ request }) => {
  const response = await request.get("/").catch((error: unknown) => {
    throw new Error(
      `No storefront at ${process.env["E2E_BASE_URL"] ?? "http://localhost:8000"}. Build and start it ` +
        `(pnpm --filter @shopblok/storefront build && … start) with Medusa seeded. ${String(error)}`,
    );
  });
  expect(response.status(), "the storefront answers / (is Medusa seeded?)").toBe(200);
});

/** The `Location` header as a path and query, whatever the host. */
function locationOf(response: APIResponse): string {
  const location = response.headers()["location"];
  if (location === undefined) throw new Error(`no Location header on ${response.status()}`);
  const url = new URL(location, response.url());
  return url.pathname + url.search;
}

test.describe("market homes: the public URL stays, the market's language is served", () => {
  const homes = [
    { request: "/", shown: "/", lang: "el-CY", key: "el-cy" },
    { request: "/us/", shown: "/us", lang: "en-US", key: "en-us" },
    { request: "/gb/", shown: "/gb", lang: "en-GB", key: "en-gb" },
    { request: "/de/", shown: "/de", lang: "de-DE", key: "de-de" },
    { request: "/fr/", shown: "/fr", lang: "fr-FR", key: "fr-fr" },
    { request: "/ch/", shown: "/ch", lang: "de-CH", key: "de-ch" },
    { request: "/ch/fr/", shown: "/ch/fr", lang: "fr-CH", key: "fr-ch" },
  ];

  for (const home of homes) {
    test(`${home.request} is <html lang="${home.lang}">`, async ({ page }) => {
      const response = await page.goto(home.request);
      expect(response?.status()).toBe(200);
      // The browser ends on the public URL (Next drops the trailing slash), never on the key.
      expect(new URL(page.url()).pathname).toBe(home.shown);
      await expect(page.locator("html")).toHaveAttribute("lang", home.lang);
      // The market's own home (the seeded Home, T65): its links are inside the market the key
      // named, the hero's way into the shop among them.
      await expect(
        page.locator('[data-slot="hero-section"] [data-slot="section-links"] a').first(),
      ).toHaveAttribute("href", `${home.shown === "/" ? "" : home.shown}/store`);
    });
  }

  test("keeps the query string through the rewrite", async ({ request }) => {
    const response = await request.get("/ch/fr?page=2&sort=asc", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-middleware-rewrite"]).toMatch(/\/fr-ch\?page=2&sort=asc$/);
  });
});

test.describe("redirects", () => {
  test("/cy goes to / with 301", async ({ request }) => {
    const response = await request.get("/cy", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(locationOf(response)).toBe("/");
  });

  // Next removes a trailing slash with a 308 before the proxy runs, so the table's `/cy/` is two
  // hops. `skipTrailingSlashRedirect` would make it one but also stops Next normalising /admin/
  // and /api/…/ (SETUP.md, T11).
  test("/cy/ goes to / in two hops: 308 to /cy (Next), then 301 to / (proxy)", async ({
    request,
  }) => {
    const first = await request.get("/cy/", { maxRedirects: 0 });
    expect(first.status()).toBe(308);
    expect(locationOf(first)).toBe("/cy");
    const second = await request.get("/cy", { maxRedirects: 0 });
    expect(second.status()).toBe(301);
    expect(locationOf(second)).toBe("/");
    const followed = await request.get("/cy/");
    expect(new URL(followed.url()).pathname).toBe("/");
    expect(followed.status()).toBe(200);
  });

  test("keeps the path and the query string", async ({ request }) => {
    const response = await request.get("/cy/store?page=2&sort=asc", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(locationOf(response)).toBe("/store?page=2&sort=asc");
  });

  test("a default language segment is redundant: /ch/de goes to /ch", async ({ request }) => {
    const response = await request.get("/ch/de", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(locationOf(response)).toBe("/ch");
  });

  // Next collapses `//` with a 308 of its own first. Every hop, Next's and the proxy's, stays on
  // this host and ends on a path of it. (A last segment with a dot is a file to the matcher.)
  for (const [path, last] of [
    ["/cy/evil.example/x", "/evil.example/x"],
    ["/cy//evilhost/x", "/evilhost/x"],
    ["/cy/%5Cevilhost", "/%5Cevilhost"],
    ["/cy///evilhost", "/evilhost"],
  ] as const) {
    test(`${path} cannot leave the host`, async ({ request, baseURL }) => {
      let target = path;
      const hops: string[] = [];
      for (let hop = 0; hop < 4; hop++) {
        const response = await request.get(target, { maxRedirects: 0 });
        if (response.status() < 300 || response.status() >= 400) break;
        const next = new URL(response.headers()["location"] ?? "", new URL(target, baseURL));
        expect(next.host, `hop ${hop} from ${target}`).toBe(new URL(baseURL ?? "").host);
        target = next.pathname + next.search;
        hops.push(target);
      }
      expect(hops.at(-1)).toBe(last);
    });
  }

  test("a POST keeps its method: 308", async ({ request }) => {
    const response = await request.post("/cy/store", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(locationOf(response)).toBe("/store");
  });
});

test.describe("the internal key is not public: 404 from global-not-found", () => {
  for (const path of ["/el-cy", "/el-cy/", "/en-us/store", "/de-ch/products/x", "/fr-ch?x=1"]) {
    test(`${path} is a 404 in English`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
      // Not Next's built-in 404 page, which has no lang.
      await expect(page.locator("html#__next_error__")).toHaveCount(0);
    });
  }

  test("its link goes to the primary market's public URL", async ({ page }) => {
    await page.goto("/el-cy");
    await expect(page.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });

  // T65: a path under a market that is no page reaches `{m}/[...slug]`, whose `notFound()` draws
  // the market's own 404 (`[market]/not-found.tsx`) in its language, linking to its home. The
  // browser swaps it in; `curl` gets Next's error shell, as for a missing product (SETUP.md, T12).
  test("a path that is no page of the market is the market's 404, in its language", async ({
    page,
  }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "el-CY");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      catalogs.el.templates.notFound.title,
    );
    await expect(page.locator('[data-slot="not-found-home"]')).toHaveAttribute("href", "/");
  });
});

test.describe("the map route the proxy reads", () => {
  test("GET /next/markets is the market map as JSON, and is not rewritten", async ({ request }) => {
    const response = await request.get("/next/markets", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
    const map = (await response.json()) as { countries: { code: string; enabled: boolean }[] };
    expect(
      map.countries.filter((country) => country.enabled).map((country) => country.code),
    ).toEqual(["cy", "us", "gb", "de", "fr", "ch"]);
  });
});

test.describe("Payload is not rewritten", () => {
  test("GET /api/pages answers 200 from Payload", async ({ request }) => {
    const response = await request.get("/api/pages", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toMatchObject({ docs: expect.any(Array) as unknown });
  });

  // M4b D95: the markets global is gone (the map is Medusa's), so Payload answers its own 404.
  test("Payload's REST API answers its own 404 for the markets global that no longer exists", async ({
    request,
  }) => {
    const response = await request.get("/api/globals/markets", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
  });

  test("/admin is Payload's panel, not a market page", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.headers()["x-middleware-rewrite"]).toBeUndefined();
    // First visit: create-first-user. Later: login. Both are forms on /admin/….
    await page.waitForURL(/\/admin\/(login|create-first-user)/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('[data-slot="home-template"]')).toHaveCount(0);
  });
});

// T22 (D33): `design-system` is a reserved first segment, like `admin` and `api`. The CI build has
// no DESIGN_SYSTEM_ENABLED, so the page answers 404 there and 200 in a build with the flag; either
// way the proxy must not have touched the request. A rewrite to a market (`/el-cy/design-system/en`)
// or to the not-found path would carry `x-middleware-rewrite`, and a 301 would be a redirect.
test.describe("the design system is not rewritten", () => {
  for (const path of ["/design-system/en", "/design-system/el/foundations/colors"]) {
    test(`${path} is no market page`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([200, 404], `status of ${path}`).toContain(response.status());
      expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
      expect(response.headers()["location"]).toBeUndefined();
    });
  }

  test("/design-system goes to /design-system/en (next.config.ts), not through the proxy", async ({
    request,
  }) => {
    const response = await request.get("/design-system", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(locationOf(response)).toBe("/design-system/en");
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
  });
});

// T28 (D54): a root path that looks like a file, and that no file or route serves, answers a
// plain-text 404 from `/next/missing-file` (next.config.ts's `afterFiles` rewrite), not the 404
// page of `[market]`. Real files still win, and deeper paths and slugs behave as before.
test.describe("root files", () => {
  const plainNotFound = "text/plain; charset=utf-8";

  for (const path of [
    "/robots.txt",
    "/sitemap.xml",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    "/wp-login.php",
  ]) {
    test(`${path} answers 404 as plain text`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
      expect(response.headers()["content-type"]).toBe(plainNotFound);
      expect(await response.text()).toBe("Not Found");
      // As Next's own 404 page: no CDN keeps it (route.ts says why).
      expect(response.headers()["cache-control"]).toBe(
        "private, no-cache, no-store, max-age=0, must-revalidate",
      );
      expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
    });
  }

  test("HEAD /robots.txt answers 404 as plain text, with no body", async ({ request }) => {
    const response = await request.head("/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toBe(plainNotFound);
    expect((await response.body()).length).toBe(0);
  });

  test("/favicon.ico is still the icon (a file route wins over the rewrite)", async ({
    request,
  }) => {
    const response = await request.get("/favicon.ico", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/x-icon");
  });

  // `/us/robots.txt` looks like a file, so the proxy leaves it alone (no rewrite to `en-us`): since
  // `{m}/[...slug]` (T65) it matches the route with `us` as the market key, which is no key, and the
  // layout's `notFound()` gives Next's default 404 page (T08, item 2). Before T65 it matched no route
  // and got `global-not-found`. Either way a 404 in HTML, never a file.
  test("/us/robots.txt is still a 404 page", async ({ request }) => {
    const response = await request.get("/us/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(await response.text()).toContain("This page could not be found");
  });

  // `/size-8.5` is a slug to the proxy (a dot before a digit), which sends it to the primary market:
  // `{m}/[...slug]` finds no page there, so the market's own 404, in Greek.
  test("/size-8.5 is still the 404 page", async ({ page }) => {
    const response = await page.goto("/size-8.5");
    expect(response?.status()).toBe(404);
    expect(response?.headers()["content-type"]).toContain("text/html");
    await expect(page.locator("html")).toHaveAttribute("lang", "el-CY");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      catalogs.el.templates.notFound.title,
    );
  });

  test("/api/robots.txt is Payload's own 404", async ({ request }) => {
    const response = await request.get("/api/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});
