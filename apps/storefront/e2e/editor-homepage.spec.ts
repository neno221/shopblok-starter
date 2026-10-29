import { expect, test, type Locator, type Page } from "@playwright/test";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";
import { rest } from "./support/payload-rest";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T71 (SPEC §17.1, M4's done-when): an editor builds, translates and publishes the homepage, in
// Payload's admin, against a production build with the seeded markets (Cyprus in Greek at `/`, the
// US in English at `/us`).
//
// - The bootstrap admin creates an editor through the REST API; everything after is the editor's,
//   in the admin's UI.
// - On Home (the site settings' homepage, seeded by `seed-content`), the editor adds a promo
//   banner, an FAQ and a product collection with two hand-picked products, watches the live
//   preview at the Mobile breakpoint (375 px), translates the hero's heading, the FAQ and the new
//   blocks' headings into Greek, and publishes.
// - `/` shows the Greek heading and `/us` the English within two requests each, with prices in EUR
//   and USD, the FAQ's `FAQPage` JSON-LD, and no console message in the browser.
//
// `afterAll` puts Home back as it was in every language, published, and removes the editor, and
// fails the run if it cannot.

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);
// An action that waits names its step when it fails, rather than the whole test's time-out.
test.use({ actionTimeout: 30_000, navigationTimeout: 60_000 });

const stamp = Date.now().toString(36);
const LANGUAGES = ["en", "el", "de", "fr"] as const;
const TEXT = {
  promo: {
    en: `Summer offer ${stamp}`,
    el: `Καλοκαιρινή προσφορά ${stamp}`,
    de: `Sommerangebot ${stamp}`,
    fr: `Offre d'été ${stamp}`,
  },
  faqQuestion: {
    en: `How long does delivery take ${stamp}?`,
    el: `Πόσο διαρκεί η παράδοση ${stamp};`,
    de: `Wie lange dauert die Lieferung ${stamp}?`,
    fr: `Combien de temps dure la livraison ${stamp} ?`,
  },
  faqAnswer: {
    en: "Two to four working days.",
    el: "Δύο έως τέσσερις εργάσιμες ημέρες.",
    de: "Zwei bis vier Werktage.",
    fr: "Deux à quatre jours ouvrés.",
  },
  picks: {
    en: `Our picks ${stamp}`,
    el: `Οι επιλογές μας ${stamp}`,
    de: `Unsere Auswahl ${stamp}`,
    fr: `Notre sélection ${stamp}`,
  },
  hero: { el: `Καθημερινά κομμάτια ${stamp}` },
};
const editor = { email: `homepage-editor-${stamp}@example.com`, password: `editor-${stamp}-pass` };

let token = "";
let editorId: number | undefined;
let homeId: number | undefined;
/** Home's `layout` as each language has it, fallbacks left out, for the restore. */
const original: Partial<Record<(typeof LANGUAGES)[number], unknown[]>> = {};
let englishHero = "";

const api = <T>(method: string, path: string, body?: unknown) => rest<T>(token, method, path, body);

/** A GET of the shop from Node, no cookies. */
const html = async (path: string) => (await fetch(`${base()}${path}`)).text();

/** The block at `index` of the layout, as the edit view draws it. */
const field = (page: Page, name: string): Locator =>
  page.locator(`input[name="${name}"], textarea[name="${name}"]`).first();

/** Adds a block of this label at the end of the layout, from the "Add Layout" drawer. */
async function addBlock(page: Page, label: string) {
  await page.getByRole("button", { name: "Add Layout" }).click();
  await page.locator(".thumbnail-card", { hasText: label }).first().click();
}

/** Picks `option` in the react-select of the field with this path (`layout.5.productSource.mode`). */
async function choose(page: Page, path: string, option: string | RegExp) {
  const control = page.locator(`#field-${path.replaceAll(".", "__")} .rs__control`).first();
  await control.click();
  await page.locator(".rs__option", { hasText: option }).first().click();
}

/** Types into a field and waits until it holds the text (autosave can redraw the form). */
async function fill(page: Page, name: string, value: string) {
  const input = field(page, name);
  await input.fill(value);
  await expect(input).toHaveValue(value);
}

/** The locale switcher of the edit view: the document reloads in `code`. */
async function switchLocale(page: Page, code: string) {
  await page
    .getByRole("button", { name: /^Locale/ })
    .first()
    .click();
  await page.locator(`.popup__content [data-locale="${code}"]`).first().click();
  await page.waitForURL(new RegExp(`[?&]locale=${code}`));
  await page.waitForLoadState("networkidle");
}

/**
 * "Publish changes": Payload 3.92 publishes every language at once and checks each language's
 * required fields, its "Publish in English" too (`publishAllLocales` without `localizeStatus`), so
 * the new blocks' required texts are written in German and French as well (SETUP.md, T63, T71).
 */
async function publish(page: Page) {
  await page.locator("#action-save").click();
  await expect(page.getByText(/successfully/i).first()).toBeVisible({ timeout: 15_000 });
}

type DraftBlock = { heading?: string; items?: { question?: string; answer?: string }[] };

/** Home's latest draft in one language, fallbacks left out. */
async function draftLayout(language: string): Promise<DraftBlock[]> {
  const answer = await api<{ layout: DraftBlock[] }>(
    "GET",
    `/api/pages/${homeId}?depth=0&draft=true&locale=${language}&fallback-locale=none`,
  );
  return answer.json().layout ?? [];
}

/** The JSON-LD `@type`s a page carries, its `@graph`s' included. */
function jsonLdTypes(source: string): string[] {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1] ?? "{}") as Record<string, unknown>)
    .flatMap((node) => [node, ...((node["@graph"] as Record<string, unknown>[]) ?? [])])
    .map((node) => String(node["@type"] ?? ""));
}

test.beforeAll(async () => {
  token = await adminToken();
  const settings = await api<{ homepage?: number | null }>(
    "GET",
    "/api/globals/site-settings?depth=0",
  );
  homeId = settings.json().homepage ?? undefined;
  expect(homeId, "the seed names Home as the homepage (seed-content)").toBeDefined();
  for (const language of LANGUAGES) {
    const answer = await api<{ layout: unknown[] }>(
      "GET",
      `/api/pages/${homeId}?depth=0&locale=${language}&fallback-locale=none`,
    );
    expect(answer.status, answer.text).toBe(200);
    original[language] = answer.json().layout;
  }
  englishHero = String((original.en?.[0] as { heading?: string } | undefined)?.heading ?? "");
  expect(englishHero).not.toBe("");

  const created = await api<{ doc: { id: number } }>("POST", "/api/users", {
    ...editor,
    role: "editor",
  });
  expect(created.status, created.text).toBe(201);
  editorId = created.json().doc.id;
});

test.afterAll(async () => {
  // Not a test: Home as it was in every language, published (English first: a publish validates
  // the default language), then the editor removed. A failure fails the run.
  const problems: string[] = [];
  if (homeId !== undefined) {
    // A lock the editor's closed browser left would refuse the restore (423).
    const locks = await api<{ docs: { id: number }[] }>(
      "GET",
      `/api/payload-locked-documents?depth=0&where[document.value][equals]=${homeId}`,
    );
    for (const lock of locks.json().docs ?? [])
      await api("DELETE", `/api/payload-locked-documents/${lock.id}`);
    for (const language of LANGUAGES) {
      const layout = original[language];
      if (layout === undefined) continue;
      const answer = await api("PATCH", `/api/pages/${homeId}?locale=${language}`, {
        layout,
        _status: "published",
      });
      if (answer.status !== 200)
        problems.push(`Home in ${language}: ${answer.status} ${answer.text}`);
    }
  }
  if (editorId !== undefined) {
    const answer = await api("DELETE", `/api/users/${editorId}`);
    if (answer.status !== 200) problems.push(`the editor: ${answer.status} ${answer.text}`);
  }
  expect(problems, "the restore").toEqual([]);
});

test("an editor builds, previews, translates and publishes the homepage in the admin", async ({
  browser,
}) => {
  // A regeneration running across the publish would keep what it read before (`settled`, T65).
  await settled("/");
  await settled("/us");
  const context = await browser.newContext({
    baseURL: base(),
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  try {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', editor.email);
    await page.fill('input[name="password"]', editor.password);
    await page.getByRole("button", { name: /^log in$|^login$/i }).click();
    await page.waitForURL(/\/admin\/?$/);

    await page.goto(`/admin/collections/pages/${homeId}?locale=en`);
    await expect(field(page, "layout.0.heading")).toHaveValue(englishHero);
    // The blocks the edit view opens with: a draft left by an earlier run would have more than
    // the published Home (the restore publishes over it).
    const blocks = (
      await page
        .locator('input[name^="layout."]')
        .evaluateAll((inputs) => inputs.map((input) => input.getAttribute("name") ?? ""))
    ).filter((name) => /^layout\.\d+\.id$/.test(name)).length;
    expect(blocks, "the edit view shows Home as published").toBe(original.en?.length);
    const [promo, faq, picks] = [blocks, blocks + 1, blocks + 2];
    /** Writes the new blocks' texts (and `hero`, the hero's heading) in another language. */
    const translate = async (code: "el" | "de" | "fr", { hero }: { hero?: string }) => {
      await switchLocale(page, code);
      // The FAQ's row opens collapsed after the reload: "Show All" opens it.
      await page
        .locator(`#field-layout__${faq}__items`)
        .getByRole("button", { name: "Show All" })
        .first()
        .click();
      if (hero !== undefined) await fill(page, "layout.0.heading", hero);
      await fill(page, `layout.${promo}.heading`, TEXT.promo[code]);
      await fill(page, `layout.${faq}.items.0.question`, TEXT.faqQuestion[code]);
      await fill(page, `layout.${faq}.items.0.answer`, TEXT.faqAnswer[code]);
      await fill(page, `layout.${picks}.heading`, TEXT.picks[code]);
      // Autosave writes the draft 375 ms after the last key; switching the language before it has
      // would lose these texts.
      await expect
        .poll(async () => {
          const draft = await draftLayout(code);
          return [
            draft[0]?.heading,
            draft[promo]?.heading,
            draft[faq]?.items?.[0]?.question,
            draft[faq]?.items?.[0]?.answer,
            draft[picks]?.heading,
          ];
        })
        .toEqual([
          hero ?? (original[code]?.[0] as { heading?: string })?.heading,
          TEXT.promo[code],
          TEXT.faqQuestion[code],
          TEXT.faqAnswer[code],
          TEXT.picks[code],
        ]);
    };

    await addBlock(page, "Promo banner");
    await fill(page, `layout.${promo}.heading`, TEXT.promo.en);
    await addBlock(page, "FAQ");
    if ((await field(page, `layout.${faq}.items.0.question`).count()) === 0)
      await page
        .locator(`#field-layout__${faq}__items`)
        .getByRole("button", { name: /^Add/ })
        .click();
    await fill(page, `layout.${faq}.items.0.question`, TEXT.faqQuestion.en);
    await fill(page, `layout.${faq}.items.0.answer`, TEXT.faqAnswer.en);
    await addBlock(page, "Product collection");
    await fill(page, `layout.${picks}.heading`, TEXT.picks.en);
    await choose(page, `layout.${picks}.productSource.mode`, "Handpicked");
    // Two products, in the order picked: the first two the picker offers.
    for (let picked = 0; picked < 2; picked++) {
      await page.locator(`#field-layout__${picks}__productSource__products .rs__control`).click();
      await page.locator(".rs__option").first().click();
    }
    await expect(
      page.locator(`#field-layout__${picks}__productSource__products .rs__multi-value`),
    ).toHaveCount(2);

    // Live preview at the Mobile breakpoint: the frame is 375 px wide and shows the draft.
    if ((await page.getByRole("button", { name: "Exit Live Preview" }).count()) === 0)
      await page.getByRole("button", { name: "Live Preview", exact: true }).first().click();
    await page.locator(".live-preview-toolbar-controls__breakpoint button").first().click();
    await page
      .locator(".popup__content")
      .getByRole("button", { name: "Mobile", exact: true })
      .click();
    await expect(page.locator('input[name="live-preview-width"]')).toHaveValue("375");
    const frame = page.frameLocator("iframe");
    await expect(frame.getByText(TEXT.promo.en)).toBeVisible({ timeout: 30_000 });
    await expect(frame.getByText(TEXT.picks.en)).toBeVisible();
    const width = await page
      .locator("iframe")
      .first()
      .evaluate((element) => element.clientWidth);
    expect(width, "the frame is the Mobile breakpoint's width").toBe(375);

    // Greek: the hero's heading, the FAQ and the new blocks' headings (a publish validates every
    // language it publishes, so each required text is written, T63).
    await translate("el", { hero: TEXT.hero.el });
    // German and French: the new blocks' required texts only; the hero keeps its own.
    await translate("de", {});
    await translate("fr", {});
    await publish(page);
  } finally {
    // Payload remembers live preview per user; this editor is removed anyway. Leaving the
    // document gives up the editor's lock on it (`afterAll` also removes one left behind).
    await page.goto("/admin").catch(() => undefined);
    await page.waitForTimeout(1_500);
    await context.close();
  }
});

test("/ shows the Greek heading and /us the English within two requests, priced, with the FAQ's JSON-LD", async () => {
  const greek = async () => (await html("/")).includes(TEXT.hero.el);
  expect(await freshWithinTwo(greek, 1_500), "/ in Greek").toBeGreaterThan(0);
  const english = async () => (await html("/us")).includes(TEXT.promo.en);
  expect(await freshWithinTwo(english, 1_500), "/us in English").toBeGreaterThan(0);

  const cyprus = await html("/");
  for (const text of [TEXT.promo.el, TEXT.faqQuestion.el, TEXT.picks.el])
    expect(cyprus, text).toContain(text);
  const us = await html("/us");
  expect(us).toContain(englishHero);
  expect(us).not.toContain(TEXT.hero.el);
  for (const text of [TEXT.faqQuestion.en, TEXT.picks.en]) expect(us, text).toContain(text);
  for (const source of [cyprus, us]) expect(jsonLdTypes(source)).toContain("FAQPage");
});

test("the two hand-picked products show with EUR in Cyprus and USD in the US, and no console message", async ({
  browser,
  baseURL,
}) => {
  const messages: Message[] = [];
  const failed: FailedRequest[] = [];
  const context = await browser.newContext({ baseURL: base() });
  const page = await context.newPage();
  collectConsole(page, messages, failed);
  try {
    for (const [path, currency] of [
      ["/", "€"],
      ["/us", "$"],
    ] as const) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const heading = path === "/" ? TEXT.picks.el : TEXT.picks.en;
      const section = page.locator('[data-slot="product-collection-section"]', {
        hasText: heading,
      });
      await expect(section.locator('[data-slot="product-card"]')).toHaveCount(2);
      await expect(section).toContainText(currency);
    }
  } finally {
    await context.close();
  }
  const { summary, local, failedLine } = judgeConsole(messages, failed, baseURL);
  expect(local, failedLine).toEqual([]);
  expect(summary).toEqual([]);
});
