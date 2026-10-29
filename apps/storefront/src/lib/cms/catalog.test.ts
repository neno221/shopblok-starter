import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const find = vi.fn();
vi.mock("./payload", () => ({ getPayloadClient: async () => ({ find }) }));

import { readCategoryContent, readCollectionContent, readProductContent } from "./catalog";

// T69 (D73, D83): a catalog document's content, read by its handle in the market's language.

const greek = { market: { language: "el" }, draft: false };
const paragraph = { type: "paragraph", children: [{ type: "text", text: "Μαλακό βαμβάκι" }] };

beforeEach(() => {
  vi.stubEnv("PAYLOAD_DATABASE_URL", "postgres://localhost/payload");
  cacheTag.mockClear();
  find.mockReset();
});

describe("the catalog's content reads", () => {
  it("read the live document by handle, in the market's language, anonymously, selected", async () => {
    find.mockResolvedValue({ docs: [{ richDescription: { root: { children: [paragraph] } } }] });
    const content = await readProductContent(greek, "demo-heritage-hoodie");
    expect(content?.description).not.toBeNull();
    const [query] = find.mock.calls[0] as [Record<string, unknown>];
    expect(query).toMatchObject({
      collection: "products",
      locale: "el",
      // A text the market's language lacks falls back to Medusa's, not to English.
      fallbackLocale: false,
      overrideAccess: false,
      user: null,
      depth: 1,
      select: { richDescription: true, gallery: true },
      where: {
        and: [
          { handle: { equals: "demo-heritage-hoodie" } },
          { deletedInMedusa: { not_equals: true } },
        ],
      },
    });
  });

  it("are tagged cms:<kind>:<handle> and cms:catalog", async () => {
    find.mockResolvedValue({ docs: [] });
    await readProductContent(greek, "mug");
    await readCategoryContent(greek, "apparel");
    await readCollectionContent(greek, "summer-edit");
    expect(cacheTag.mock.calls).toEqual([
      ["cms:product:mug", "cms:catalog"],
      ["cms:category:apparel", "cms:catalog"],
      ["cms:collection:summer-edit", "cms:catalog"],
    ]);
  });

  it("give null for a handle Payload has no live document for, and without a database", async () => {
    find.mockResolvedValue({ docs: [] });
    expect(await readCategoryContent(greek, "gone")).toBeNull();
    vi.stubEnv("PAYLOAD_DATABASE_URL", "");
    find.mockClear();
    expect(await readCategoryContent(greek, "apparel")).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });
});
