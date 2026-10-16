import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type Request,
} from "@playwright/test";
import { colors } from "../../../packages/ui/src/tokens";

// T20: the shared stylesheet and Inter (SETUP.md, "Styles and fonts (T20)"; plan D28). Run against
// `next start` after `pnpm build`.
//
// The font files are told apart by what the built stylesheet says about them: `next/font` writes
// one @font-face per subset, each with its own `unicode-range`, and the Greek one is the face whose
// range contains U+370-377 (the Greek and Coptic block's first letters; Google's source CSS writes
// it U+0370-0377, the minified build U+370-377).

const GREEK_RANGE_MARK = /U\+0?370-0?377/i;
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
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (GOOGLE_HOSTS.test(url.hostname)) google.push(request.url());
    if (url.pathname.endsWith(".woff2"))
      woff2.push(url.pathname.split("/").pop() ?? url.pathname);
  };
  page.on("request", onRequest);
  try {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
  } finally {
    page.off("request", onRequest);
  }
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
        GREEK_RANGE_MARK.test(face.unicodeRange),
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

/**
 * The colour `--name` resolves to, as the `rgb(r, g, b)` a browser computes. It is read from
 * packages/ui's generated tokens.ts, which holds each colour resolved to `#rrggbb`, and not from
 * tokens.css, where a colour the kit aliases to a palette colour is written `var(--primitive)`.
 */
function tokenColour(name: string): string {
  const hex = colors.find((color) => color.name === name)?.value;
  if (hex === undefined || !/^#[0-9a-f]{6}$/.test(hex))
    throw new Error(`--${name} is not a #rrggbb colour in tokens.ts`);
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}

test.describe("the shared stylesheet", () => {
  // tokens.css writes `--input: var(--neutral-450)`: a colour the kit aliases to a palette
  // colour (or one of ours) is not a literal there, and the helper resolves it all the same.
  test("tokenColour resolves a colour that tokens.css writes as var(--…)", () => {
    expect(tokenColour("input")).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(tokenColour("sidebar-foreground")).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  // T19 (moved from T20): the base layer of globals.css uses the tokens.
  for (const path of ["/us", "/", "/no-such-page-t20"]) {
    test(`on ${path} the body's colour, background and border colour are tokens.css's`, async ({
      page,
    }) => {
      await load(page, path);
      const computed = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderTopColor,
        };
      });
      expect(computed).toEqual({
        color: tokenColour("foreground"),
        backgroundColor: tokenColour("background"),
        borderColor: tokenColour("border"),
      });
      // Not preflight's black on transparent: the tokens are in use.
      expect(computed.color).not.toBe("rgb(0, 0, 0)");
    });
  }

  test("a class used only inside packages/ui/src is in the built CSS (@source)", async ({
    page,
    request,
  }) => {
    await load(page, "/us");
    const css = await builtCss(page, request);
    // The Switch atom's hit area (packages/ui/src/atoms/switch.tsx) is the one place this class is
    // written; the storefront only imports the component, so only `@source` can find it.
    expect(
      css.includes(".after\\:-inset-y-\\[13px\\]"),
      "the built CSS has the rule for the Switch's hit area",
    ).toBe(true);
  });
});
