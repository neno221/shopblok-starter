import { expect, test } from "@playwright/test";

// T49 (D58, D61, SPEC §8.4, §12): the product page against `next start` with the demo catalog. The
// shell's HTML holds the product in the market's language and currency (what `curl` gets: the
// default variant's price, no cart count); `?variant=` chooses on load; an add from the keyboard
// updates the header's count; a missing product is a 404 that crawlers drop; the head has the
// canonical, the hreflang alternates and JSON-LD.

const HANDLE = "demo-heritage-hoodie";
const TITLE = { en: "Heritage Hoodie", el: "Φούτερ με κουκούλα Heritage" };

type Offer = { "@type": string; url: string; priceCurrency: string };
type Graph = {
  "@graph": ({ "@type": string; name?: string; offers?: Offer[] } & Record<string, unknown>)[];
};

function jsonLd(html: string): Graph {
  const text = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1];
  if (text === undefined) throw new Error("no JSON-LD on the page");
  return JSON.parse(text) as Graph;
}

test.describe("the product page (T49)", () => {
  test("the server's HTML has the product in the market's language and currency, and no count", async ({
    request,
  }) => {
    const cy = await (await request.get(`/products/${HANDLE}`)).text();
    expect(cy).toContain('<html lang="el-CY"');
    expect(cy).toContain(TITLE.el);
    expect(cy).toMatch(/€/);
    const us = await (await request.get(`/us/products/${HANDLE}`)).text();
    expect(us).toContain(`>${TITLE.en}</h1>`);
    expect(us).toMatch(/\$\d/);
    expect(us).not.toContain("€");
    for (const html of [cy, us]) {
      expect(html).toContain('data-slot="buy-box"');
      expect(html).not.toContain('data-slot="cart-badge"');
    }
  });

  test("the head has the canonical, the hreflang alternates and the product's JSON-LD", async ({
    request,
  }) => {
    const html = await (await request.get(`/us/products/${HANDLE}?variant=anything`)).text();
    expect(html).toMatch(
      new RegExp(`<link rel="canonical" href="https?://[^"]+/us/products/${HANDLE}"/>`),
    );
    for (const [lang, path] of [
      ["el-CY", `/products/${HANDLE}`],
      ["en-US", `/us/products/${HANDLE}`],
      ["fr-CH", `/ch/fr/products/${HANDLE}`],
      ["x-default", `/products/${HANDLE}`],
    ])
      expect(html).toMatch(
        new RegExp(`<link rel="alternate" hrefLang="${lang}" href="https?://[^"]+${path}"/>`),
      );
    const graph = jsonLd(html)["@graph"];
    const product = graph.find((node) => node["@type"] === "Product");
    expect(product?.name).toBe(TITLE.en);
    expect(product?.offers?.length).toBeGreaterThan(1);
    expect(product?.offers?.every((offer) => offer.priceCurrency === "USD")).toBe(true);
    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });

  test("a missing product is a 404 with noindex", async ({ request }) => {
    const response = await request.get("/us/products/no-such-product");
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<meta name="robots" content="noindex"/>');
  });

  test("?variant= chooses that variant on load", async ({ page, request }) => {
    const html = await (await request.get(`/us/products/${HANDLE}`)).text();
    const offer = jsonLd(html)["@graph"].find((node) => node["@type"] === "Product")?.offers?.[0];
    expect(offer).toBeDefined();
    await page.goto(new URL(offer?.url as string).pathname + new URL(offer?.url as string).search);
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box.locator('[role="radio"][aria-checked="true"]')).toHaveCount(2);
    await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  });

  test("choosing writes the variant into the URL, and an add from the keyboard updates the count", async ({
    page,
  }) => {
    await page.goto(`/us/products/${HANDLE}`);
    // The island has replaced the server's buy box once its wrapper is there.
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box).toHaveCount(1);
    await box.getByRole("radio", { name: "Navy" }).focus();
    await page.keyboard.press("Space");
    await expect(page).not.toHaveURL(/variant=/);
    await box.getByRole("radio", { name: "M", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\?variant=variant_/);
    await box.locator('[data-slot="buy-box-add"]').focus();
    await page.keyboard.press("Enter");
    await expect(box.locator('[data-slot="buy-box-status"]')).not.toBeEmpty();
    await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1");
  });
});
