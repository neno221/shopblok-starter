import { describe, expect, it } from "vitest";
import { applyTitleTemplate, titleTemplateOf, withSeo } from "./meta";
import { cmsPageJsonLd } from "./page";

// D82 (T68): the document's `meta`, then the template's metadata, then the site settings'.

const base = new URL("https://shop.example");
const picture = (name: string) => ({
  src: `/api/media/file/${name}`,
  alt: name,
  width: 1200,
  height: 630,
});

const template = {
  title: "Linen shirt",
  description: "A shirt in washed linen.",
  alternates: { canonical: "/us/products/linen-shirt" },
  openGraph: { type: "website" as const, title: "Linen shirt", url: "/us/products/linen-shirt" },
};
const site = { description: "Linen for warm days.", image: picture("site.webp") };

describe("withSeo", () => {
  it("takes the document's meta first: its title as written, past the layout's template", () => {
    const metadata = withSeo(
      template,
      {
        title: "Linen shirt, washed | Kalimera",
        description: "Our best shirt.",
        image: picture("shirt.webp"),
      },
      site,
      base,
    );
    expect(metadata.title).toEqual({ absolute: "Linen shirt, washed | Kalimera" });
    expect(metadata.description).toBe("Our best shirt.");
    expect(metadata.openGraph).toEqual({
      type: "website",
      url: "/us/products/linen-shirt",
      title: "Linen shirt, washed | Kalimera",
      description: "Our best shirt.",
      images: [
        {
          url: "https://shop.example/api/media/file/shirt.webp",
          width: 1200,
          height: 630,
          alt: "shirt.webp",
        },
      ],
    });
    expect(metadata.alternates).toEqual(template.alternates);
  });

  it("then the template's, part by part", () => {
    const metadata = withSeo(template, { description: "Our best shirt." }, site, base);
    expect(metadata.title).toBe("Linen shirt");
    expect(metadata.description).toBe("Our best shirt.");
    expect(metadata.openGraph?.title).toBe("Linen shirt");
  });

  it("then the site's description and picture, where the template has none", () => {
    const metadata = withSeo({ title: "Journal", openGraph: { title: "Journal" } }, {}, site, base);
    expect(metadata.description).toBe("Linen for warm days.");
    expect(metadata.openGraph).toMatchObject({
      description: "Linen for warm days.",
      images: [{ url: "https://shop.example/api/media/file/site.webp" }],
    });
    // A template's own picture stays.
    const own = withSeo({ openGraph: { images: ["/a.webp"] } }, null, site, base);
    expect(own.openGraph?.images).toEqual(["/a.webp"]);
    // Nothing anywhere: nothing added.
    expect(withSeo({ title: "x" }, null, {}, base)).toEqual({ title: "x" });
  });
});

describe("withSeo's last picture: the market's generated one (M7 D147, T110)", () => {
  const share = (title?: string) => ({
    src: `https://shop.example/us/share-image${title === undefined ? "" : `?title=${title}`}`,
    alt: title ?? "Kalimera",
    width: 1200,
    height: 630,
  });

  it("is the market's picture with the page's title, where nothing else has one", () => {
    const metadata = withSeo(template, null, { share }, base);
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://shop.example/us/share-image?title=Linen%20shirt",
        width: 1200,
        height: 630,
        alt: "Linen shirt",
      },
    ]);
  });

  it("takes the Open Graph title for a page whose title is a template's object", () => {
    const metadata = withSeo(
      { title: { absolute: "Journal" }, openGraph: { title: "Journal" } },
      null,
      { share },
      base,
    );
    expect(metadata.openGraph?.images).toMatchObject([{ alt: "Journal" }]);
  });

  it("is the market's card for a layout's metadata with no title", () => {
    const metadata = withSeo({}, null, { share }, base);
    expect(metadata.openGraph?.images).toMatchObject([
      { url: "https://shop.example/us/share-image", alt: "Kalimera" },
    ]);
  });

  it("comes after the document's picture, the template's and the site's", () => {
    expect(
      withSeo(template, { image: picture("shirt.webp") }, { share }, base).openGraph?.images,
    ).toMatchObject([{ url: "https://shop.example/api/media/file/shirt.webp" }]);
    expect(
      withSeo({ openGraph: { images: ["/a.webp"] } }, null, { share }, base).openGraph?.images,
    ).toEqual(["/a.webp"]);
    expect(
      withSeo(template, null, { image: picture("site.webp"), share }, base).openGraph?.images,
    ).toMatchObject([{ url: "https://shop.example/api/media/file/site.webp" }]);
  });
});

describe("the title template", () => {
  it("is the site's when it has exactly one %s, else `%s | {store}`", () => {
    expect(titleTemplateOf("%s · Kalimera", "Kalimera")).toBe("%s · Kalimera");
    expect(titleTemplateOf("Kalimera", "Kalimera")).toBe("%s | Kalimera");
    expect(titleTemplateOf("%s %s", "Kalimera")).toBe("%s | Kalimera");
    expect(titleTemplateOf(undefined, "Shopblok")).toBe("%s | Shopblok");
    expect(applyTitleTemplate("%s · Kalimera", "About")).toBe("About · Kalimera");
  });
});

describe("a CMS page's JSON-LD (T68)", () => {
  it("is a WebPage with its BreadcrumbList, the page last", () => {
    const data = cmsPageJsonLd(
      {
        title: "Team",
        href: "/us/about/team",
        language: "en-US",
        description: "Who we are.",
        breadcrumbs: {
          trail: [
            { label: "Home", href: "/us" },
            { label: "About", href: "/us/about" },
          ],
          current: "Team",
        },
      },
      base,
    ) as unknown as { "@graph": [Record<string, unknown>, { itemListElement: unknown[] }] };
    const [page, breadcrumbs] = data["@graph"];
    expect(page).toEqual({
      "@type": "WebPage",
      "@id": "https://shop.example/us/about/team#page",
      name: "Team",
      url: "https://shop.example/us/about/team",
      inLanguage: "en-US",
      description: "Who we are.",
    });
    expect(breadcrumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shop.example/us" },
      { "@type": "ListItem", position: 2, name: "About", item: "https://shop.example/us/about" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Team",
        item: "https://shop.example/us/about/team",
      },
    ]);
  });
});
