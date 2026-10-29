import { markets as seeded } from "@shopblok/fixtures";
import type { CollectionConfig, Config, Field, FieldAccess, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  generateDescription,
  generateImage,
  generateTitle,
  generateURL,
  metaContentField,
  seo,
} from "./seo";

// D82 (T68): the SEO fields and their suggestions.

const settings = {
  storeName: "Kalimera",
  seo: { titleTemplate: "%s · Kalimera", description: "Linen for warm days.", image: 12 },
};
const findGlobal = vi.fn(async ({ slug }: { slug: string }) =>
  slug === "markets" ? seeded : settings,
);
const req = { payload: { findGlobal, findByID: vi.fn() } } as unknown as PayloadRequest;
const args = (doc: Record<string, unknown>, slug = "posts", locale = "en") =>
  ({ doc, locale, req, collectionConfig: { slug } }) as never;

describe("the suggestions", () => {
  it("title: the document's title in the site's title template, in the language edited", async () => {
    expect(await generateTitle(args({ title: "Spring" }))).toBe("Spring · Kalimera");
    expect(findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "site-settings", locale: "en" }),
    );
    expect(await generateTitle(args({ title: " " }))).toBe("");
    findGlobal.mockResolvedValueOnce({
      storeName: "Kalimera",
      seo: { titleTemplate: "broken" },
    } as never);
    expect(await generateTitle(args({ title: "Spring" }))).toBe("Spring | Kalimera");
  });

  it("description: a post's summary, else the site's", async () => {
    expect(await generateDescription(args({ excerpt: "What we wear in May." }))).toBe(
      "What we wear in May.",
    );
    expect(await generateDescription(args({}, "pages"))).toBe("Linen for warm days.");
  });

  it("picture: a post's, else the site's", async () => {
    expect(await generateImage(args({ hero: { id: 5 } }))).toBe(5);
    expect(await generateImage(args({ hero: null }, "pages"))).toBe(12);
  });

  it("URL: the document's address in the market its language is previewed in", async () => {
    expect(await generateURL(args({ slug: "spring" }, "posts", "en"))).toBe(
      "http://localhost:8000/us/journal/spring",
    );
    expect(await generateURL(args({ handle: "tee" }, "products", "el"))).toBe(
      "http://localhost:8000/products/tee",
    );
    expect(await generateURL(args({}, "posts"))).toBe("");
  });
});

const named = (fields: readonly Field[], name: string) =>
  fields.find((field) => "name" in field && field.name === name);

describe("where the fields are", () => {
  const collections = (
    seo({
      collections: [
        { slug: "pages", fields: [{ name: "title", type: "text" }] },
        { slug: "posts", fields: [{ name: "title", type: "text" }] },
        { slug: "products", fields: [{ name: "title", type: "text" }] },
      ] as CollectionConfig[],
    } as Config) as Config
  ).collections!;

  it("the plugin adds `meta` to the pages and the posts, and leaves the synced collections alone", () => {
    for (const slug of ["pages", "posts"]) {
      const meta = named(collections.find((each) => each.slug === slug)!.fields, "meta");
      expect(
        meta && "fields" in meta
          ? meta.fields.map((each) => ("name" in each ? each.name : ""))
          : [],
      ).toEqual(["overview", "title", "description", "image", "preview"]);
    }
    expect(
      named(collections.find((each) => each.slug === "products")!.fields, "meta"),
    ).toBeUndefined();
  });

  it("on a synced collection, `meta` is content: staff write it, the sync does not (T69)", () => {
    const field = metaContentField();
    const write = (access: FieldAccess | undefined, user: unknown) =>
      access?.({ req: { user } } as Parameters<FieldAccess>[0]);
    expect(write(field.access?.update, { collection: "users", id: 2, role: "editor" })).toBe(true);
    expect(
      write(field.access?.update, { collection: "integrations", id: 1, role: "medusa-sync" }),
    ).toBe(false);
    expect(write(field.access?.create, null)).toBe(false);
    expect(field.access?.read).toBeUndefined();
    // The texts are localized, the picture too, as the plugin has them.
    for (const name of ["title", "description", "image"])
      expect(named(field.fields, name), name).toMatchObject({ localized: true });
  });
});
