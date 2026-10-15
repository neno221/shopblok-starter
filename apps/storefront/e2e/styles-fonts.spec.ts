import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

// T20: the shared stylesheet and Inter (SETUP.md, "Styles and fonts (T20)"; plan D28). Run against
// `next start` after `pnpm build`.
//
// The font files are told apart by what the built stylesheet says about them: `next/font` writes
// one @font-face per subset, each with its own `unicode-range`, and the Greek one is the face whose
// range contains U+370-377 (the Greek and Coptic block's first letters).

const GREEK_RANGE_MARK = "U+370-377";
const GOOGLE_HOSTS = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

type FontFace = { file: string; unicodeRange: string };

/** The stylesheet URLs a rendered page links to. */
async function stylesheetUrls(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ).map((link) => link.href),
  );
}

async function builtCss(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  const urls = await stylesheetUrls(page);
  expect(urls.length, "the page links at least one stylesheet").toBeGreaterThan(
    0,
  );
  const bodies = await Promise.all(
    urls.map(async (url) => {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      return response.text();
    }),
  );
  return bodies.join("\n");
}

/** Each Inter @font-face of `css`: the woff2 file's name and its unicode-range. */
function interFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    if (!/font-family:\s*["']?Inter["']?\s*[;}]/.test(block)) continue;
    const file = /url\(([^)]*\.woff2)\)/.exec(block)?.[1];
    const unicodeRange = /unicode-range:\s*([^;}]*)/.exec(block)?.[1];
    if (file !== undefined && unicodeRange !== undefined) {
      faces.push({ file: file.split("/").pop() ?? file, unicodeRange });
    }
  }
  return faces;
}

/** Every font file and every Google host the page asks for while it loads and settles. */
async function load(page: Page, path: string) {
  const woff2: string[] = [];
  const google: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (GOOGLE_HOSTS.test(url.hostname)) google.push(request.url());
    if (url.pathname.endsWith(".woff2"))
      woff2.push(url.pathname.split("/").pop() ?? url.pathname);
  });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return { woff2, google };
}

test.describe("Inter through next/font", () => {
  test("the body's font-family starts with Inter, and Inter is loaded", async ({
    page,
  }) => {
    await load(page, "/us");
    const family = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(family).toMatch(/^"?Inter"?\s*,/);
    const loaded = await page.evaluate(
      () =>
        Array.from(document.fonts).filter(
          (face) =>
            face.family.replace(/"/g, "") === "Inter" &&
            face.status === "loaded",
        ).length,
    );
    expect(loaded, "an Inter face is loaded, not just named").toBeGreaterThan(
      0,
    );
  });

  test("the global 404 page (its own <html>) uses Inter too", async ({
    page,
  }) => {
    const response = await page.goto("/no-such-page-t20");
    expect(response?.status()).toBe(404);
    const family = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(family).toMatch(/^"?Inter"?\s*,/);
  });

  test("/ (Greek) loads the Greek subset file; /us does not", async ({
    browser,
    request,
  }) => {
    const greekPage = await browser.newPage();
    const usPage = await browser.newPage();
    try {
      const greek = await load(greekPage, "/");
      const us = await load(usPage, "/us");
      const faces = interFaces(await builtCss(greekPage, request));
      const greekFiles = faces.filter((face) =>
        face.unicodeRange.includes(GREEK_RANGE_MARK),
      );
      expect(
        greekFiles,
        "exactly one @font-face covers the Greek letters",
      ).toHaveLength(1);
      const greekFile = greekFiles[0]?.file ?? "";
      expect(greek.woff2, "the Greek market asks for the Greek file").toContain(
        greekFile,
      );
      expect(us.woff2, "the US market does not").not.toContain(greekFile);
      // The control: the US page does load some Inter file (the Latin one), so an empty list
      // would mean the recording is broken, not that the subsets work.
      expect(us.woff2.length, "the US page loads a font file").toBeGreaterThan(
        0,
      );
    } finally {
      await greekPage.close();
      await usPage.close();
    }
  });

  test("no request goes to Google's font hosts", async ({ page }) => {
    for (const path of ["/", "/us", "/no-such-page-t20"]) {
      const { google } = await load(page, path);
      expect(google, `${path} asks Google for nothing`).toEqual([]);
    }
  });
});

test.describe("the shared stylesheet", () => {
  test("a class used only inside packages/ui/src is in the built CSS (@source)", async ({
    page,
    request,
  }) => {
    await load(page, "/us");
    const css = await builtCss(page, request);
    // packages/ui/src/styles/source-probe.ts is the one place this class is written.
    expect(
      css.includes(".min-w-\\[37\\.5rem\\]"),
      "the built CSS has the rule for the probe class",
    ).toBe(true);
  });
});
