import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminToken, base } from "./support/server";

// T63: a page with every content block, published through Payload's REST API as the bootstrap
// admin and read through T59's test page (`/[market]/e2e-cms/[slug]`, `E2E_TEST_ROUTES=true`),
// which draws its `layout` with `RenderBlocks`. In the US market (`/us`, English) and in Cyprus
// (`/`, Greek: the page's Greek title and slug, the blocks' text copied from English): every
// section, the settings applied, one FAQPage JSON-LD, links in the market, no axe violation, and
// nothing requested from YouTube before the play button is pressed. The page and its uploads are
// deleted afterwards.

const stamp = Date.now().toString(36);
const english = { title: `Blocks ${stamp}`, slug: `e2e-blocks-${stamp}` };
const greek = { title: `Ενότητες ${stamp}`, slug: `e2e-enotites-${stamp}` };

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** A 1 × 1 PNG; Payload stores its size, so the image has the width and height a section needs. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
/**
 * A one-frame, 16 × 16 MP4 (`ffmpeg -f lavfi -i color=c=black:s=16x16 -c:v mpeg4 -frames:v 1`):
 * Payload checks an MP4's boxes, so the file has to be a real one. It is never played.
 */
const MP4 = Buffer.from(
  [
    "AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAA0Ftb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAKAABAA",
    "ABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAACAAACa3RyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAQ",
    "AAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAEAAAABAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAA",
    "ACgAAAAAAAEAAAAAAeNtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAADIAAAACAFXEAAAAAAAtaGRscgAAAAAAAAAAdm",
    "lkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAGObWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAc",
    "ZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABTnN0YmwAAADqc3RzZAAAAAAAAAABAAAA2m1wNHYAAAAAAAAAAQAAAA",
    "AAAAAAAAAAAAAAAAAAEAAQAEgAAABIAAAAAAAAAAETTGF2YzYwLjMxLjEwMiBtcGVnNAAAAAAAAAAAAAAAAAAY//8A",
    "AABgZXNkcwAAAAADgICATwABAASAgIBBIBEAAAAAAw1AAAAOEAWAgIAvAAABsAEAAAG1iRMAAAEAAAABIADEjYgAzQ",
    "CEAhRjAAABskxhdmM2MC4zMS4xMDIGgICAAQIAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAMNQAAADhAAAAAY",
    "c3R0cwAAAAAAAAABAAAAAQAAAgAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEgAAAA",
    "EAAAAUc3RjbwAAAAAAAAABAAADbQAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAA",
    "AAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAAAabWRhdA",
    "AAAbMAEAcAAAG2EGBRgj237w==",
  ].join(""),
  "base64",
);
const VTT = Buffer.from("WEBVTT\n\n00:00.000 --> 00:02.000\nHello\n", "utf8");

const headers = (token: string) => ({
  Authorization: `JWT ${token}`,
  Origin: new URL(base()).origin,
});

async function upload(token: string, name: string, type: string, bytes: Buffer, alt: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), name);
  form.append("_payload", JSON.stringify({ alt }));
  const response = await fetch(`${base()}/api/media?locale=en`, {
    method: "POST",
    headers: headers(token),
    body: form,
  });
  if (!response.ok)
    throw new Error(`uploading ${name} answered ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { doc: { id: number; mimeType: string } }).doc;
}

async function api(token: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`${base()}${path}`, {
    method,
    headers: { ...headers(token), "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as { doc: { id: number } };
}

/** Every content block, in the registry's order, with a little of everything each can hold. */
function layout(media: { image: number; video: number; captions: number }) {
  const paragraph = (text: string, link?: { url: string; label: string }) => ({
    type: "paragraph",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    children: [
      { type: "text", version: 1, text, format: 0, style: "", mode: "normal", detail: 0 },
      ...(link === undefined
        ? []
        : [
            {
              type: "link",
              version: 3,
              direction: "ltr",
              format: "",
              indent: 0,
              fields: { linkType: "custom", url: link.url, newTab: false },
              children: [
                {
                  type: "text",
                  version: 1,
                  text: link.label,
                  format: 0,
                  style: "",
                  mode: "normal",
                  detail: 0,
                },
              ],
            },
          ]),
    ],
  });
  const lexical = (...children: unknown[]) => ({
    root: { type: "root", version: 1, direction: "ltr", format: "", indent: 0, children },
  });
  return [
    {
      blockType: "richText",
      content: lexical(
        paragraph("Made to be worn for years. Read ", { url: "/sale", label: "the sale" }),
      ),
      sectionSettings: { anchor: "story", surface: "muted" },
    },
    {
      blockType: "mediaWithText",
      media: media.image,
      imageSide: "start",
      heading: "The Heritage collection",
      content: lexical(paragraph("Heavyweight jersey and a lined hood.")),
      links: [
        { link: { type: "custom", url: "/collections/heritage", label: "Shop the collection" } },
      ],
    },
    {
      blockType: "uspBar",
      items: [
        { icon: "delivery", title: "Free delivery", text: "On orders over $75" },
        { icon: "returns", title: "30-day returns" },
      ],
      sectionSettings: { surface: "inverse", spacing: "small" },
    },
    {
      blockType: "logoCloud",
      heading: "As seen in",
      logos: [{ name: "Northwind Weekly", image: media.image, url: "https://north.example" }],
    },
    {
      blockType: "faq",
      heading: "Questions",
      items: [
        { question: "How long does delivery take?", answer: "Two to four days.\n\nFree over $75." },
        { question: "Can I return an item?", answer: "Yes, within 30 days." },
      ],
    },
    {
      blockType: "testimonials",
      heading: "What our customers say",
      quotes: [
        { quote: "Soft and sturdy.", author: "Jordan P.", role: "Verified buyer", rating: 5 },
      ],
    },
    {
      blockType: "video",
      title: "How the hoodie is made",
      source: "embed",
      url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      caption: "Two minutes in the mill.",
    },
    {
      blockType: "video",
      title: "The mill in Portugal",
      source: "upload",
      file: media.video,
      captions: [{ language: "en", file: media.captions }],
      poster: media.image,
    },
    { blockType: "spacer", size: "medium", divider: true },
    // A second FAQ: the page still has one FAQPage, with all three questions.
    { blockType: "faq", items: [{ question: "Do you ship to Cyprus?", answer: "Yes." }] },
  ].map((block) => ({ variant: "standard", ...block }));
}

const SECTIONS = [
  "rich-text-section",
  "media-with-text-section",
  "usp-bar-section",
  "logo-cloud-section",
  "faq-section",
  "testimonials-section",
  "video-section",
  "spacer-section",
];

/** Requests to a video provider, from the moment `page` was opened. */
function providerRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (/(^|\.)(youtube|youtube-nocookie|ytimg|googlevideo|vimeo|vimeocdn)\.com$/.test(host))
      seen.push(request.url());
  });
  return seen;
}

test.describe("a page's content blocks (T63)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let pageId: number | undefined;
  const uploads: number[] = [];

  test.beforeAll(async () => {
    token = await adminToken();
    // Each upload is kept for `afterAll` as soon as it exists, so a failure leaves none behind.
    const kept = async (doc: Promise<{ id: number; mimeType: string }>) => {
      const saved = await doc;
      uploads.push(saved.id);
      return saved;
    };
    const image = await kept(
      upload(token, `e2e-${stamp}.png`, "image/png", PNG, "A folded hoodie"),
    );
    const video = await kept(upload(token, `e2e-${stamp}.mp4`, "video/mp4", MP4, "The mill"));
    const captions = await kept(
      upload(token, `e2e-${stamp}.vtt`, "text/vtt", VTT, "English captions"),
    );
    expect([video.mimeType, captions.mimeType]).toEqual(["video/mp4", "text/vtt"]);
    const created = await api(token, "POST", "/api/pages?locale=en", {
      ...english,
      layout: layout({ image: image.id, video: video.id, captions: captions.id }),
      _status: "published",
    });
    pageId = created.doc.id;
    // Publishing in Greek needs every required field in Greek too: the editor's "copy from
    // English", the same rows (their ids) with the English text.
    const saved = (await api(
      token,
      "GET",
      `/api/pages/${pageId}?locale=en&depth=0`,
    )) as unknown as {
      layout: unknown[];
    };
    await api(token, "PATCH", `/api/pages/${pageId}?locale=el`, {
      ...greek,
      layout: saved.layout,
      _status: "published",
    });
  });

  test.afterAll(async () => {
    if (pageId !== undefined)
      await api(token, "DELETE", `/api/pages/${pageId}`).catch(() => undefined);
    for (const id of uploads) await api(token, "DELETE", `/api/media/${id}`).catch(() => undefined);
  });

  for (const market of [
    { name: "the US, in English", prefix: "/us", slug: english.slug, title: english.title },
    { name: "Cyprus, in Greek", prefix: "", slug: greek.slug, title: greek.title },
  ]) {
    test(`draws every block in ${market.name}, with no axe violation`, async ({ page }) => {
      const requested = providerRequests(page);
      await page.goto(`${market.prefix}/e2e-cms/${market.slug}`);
      await expect(page.getByTestId("cms-title")).toHaveText(market.title);
      const main = page.locator("main#main");
      for (const slot of SECTIONS)
        await expect(main.locator(`[data-slot="${slot}"]`).first(), slot).toBeAttached();
      // The settings: the anchor and the surfaces.
      await expect(main.locator("#story")).toHaveAttribute("data-surface", "muted");
      await expect(main.locator('[data-slot="usp-bar-section"]')).toHaveAttribute(
        "data-surface",
        "inverse",
      );
      // Links in the market: the rich text's and the media-with-text's custom paths.
      await expect(main.getByRole("link", { name: "the sale" })).toHaveAttribute(
        "href",
        `${market.prefix}/sale`,
      );
      await expect(main.getByRole("link", { name: "Shop the collection" })).toHaveAttribute(
        "href",
        `${market.prefix}/collections/heritage`,
      );
      // One FAQPage for the page's two FAQs, three questions.
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((scripts) =>
          scripts
            .map((script) => JSON.parse(script.textContent ?? "{}") as { "@type"?: string })
            .filter((data) => data["@type"] === "FAQPage"),
        );
      expect(ld).toHaveLength(1);
      expect((ld[0] as { mainEntity: unknown[] }).mainEntity).toHaveLength(3);
      // The upload: the browser's player, its captions on, nothing loaded before play.
      const video = main.locator("video");
      await expect(video).toHaveAttribute("preload", "none");
      await expect(video.locator("track[default]")).toHaveAttribute("srclang", "en");
      await page.waitForLoadState("networkidle");
      expect(requested, "requests to a video provider before any click").toEqual([]);
      const axe = await new AxeBuilder({ page }).include("main#main").withTags(axeTags).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }

  test("loads YouTube's player only when the play button is pressed, and moves the focus to it", async ({
    page,
  }) => {
    const requested = providerRequests(page);
    await page.goto(`/us/e2e-cms/${english.slug}`);
    const embed = page.locator('[data-slot="video-embed"]');
    await expect(embed.locator("iframe")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    expect(requested).toEqual([]);
    await embed.getByRole("button", { name: "Play video: How the hoodie is made" }).click();
    const frame = embed.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0",
    );
    await expect(frame).toHaveAttribute("title", "How the hoodie is made");
    await expect(frame).toBeFocused();
  });

  test("opens a FAQ answer without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${base()}/us/e2e-cms/${english.slug}`);
    const question = page.locator("details").first();
    await expect(question).not.toHaveAttribute("open", "");
    await question.locator("summary").click();
    await expect(question).toHaveAttribute("open", "");
    await expect(question.getByText("Free over $75.")).toBeVisible();
    await context.close();
  });
});
