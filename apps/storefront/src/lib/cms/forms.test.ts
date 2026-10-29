import { beforeEach, describe, expect, it, vi } from "vitest";

// D81 (T67): the forms the server action takes posts to, read from the footer and the published
// pages. The cache is a stand-in that holds what `cached` says (`null`: no content database, or
// `undefined`: run the loader), and the Local API is a fake.

const find = vi.fn();
const findGlobal = vi.fn();
let cached: number[] | null | undefined;
vi.mock("./payload", () => ({ getPayloadClient: async () => ({ find, findGlobal }) }));
vi.mock("./read", () => ({
  CMS_FALLBACK_LOCALE: "en",
  cmsRead:
    (load: (...args: unknown[]) => unknown) =>
    async (_reader: unknown, ...args: unknown[]) =>
      cached !== undefined
        ? cached
        : load({ find, findGlobal }, { locale: "en", draft: false, user: null }, ...args),
}));

const { isFormPlaced } = await import("./forms");
const reader = { market: { language: "en" }, draft: false };

beforeEach(() => {
  cached = undefined;
  find.mockReset();
  findGlobal.mockReset();
});

describe("isFormPlaced", () => {
  it("finds the footer's newsletter and each form in a page's blocks", async () => {
    findGlobal.mockResolvedValue({ newsletter: { form: 1 } });
    find.mockResolvedValue({
      docs: [
        {
          layout: [
            { blockType: "newsletter", form: 1 },
            { blockType: "formBlock", form: { id: 2 } },
            { blockType: "richText" },
          ],
        },
        { layout: null },
        { layout: [{ blockType: "formBlock", form: 3 }] },
      ],
    });
    for (const id of [1, 2, 3]) expect(await isFormPlaced(reader, id)).toBe(true);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "pages", draft: false, user: null, depth: 0 }),
    );
  });

  it("finds no form with no footer signup and no page with a form", async () => {
    findGlobal.mockResolvedValue({ newsletter: { form: null } });
    find.mockResolvedValue({ docs: [{ layout: [{ blockType: "spacer" }] }] });
    expect(await isFormPlaced(reader, 1)).toBe(false);
  });

  it("trusts the cached list for a form in it, and reads again, uncached, for one missing", async () => {
    cached = [1];
    expect(await isFormPlaced(reader, 1)).toBe(true);
    expect(find).not.toHaveBeenCalled();
    // Published a moment ago: the cached list is stale.
    findGlobal.mockResolvedValue({ newsletter: {} });
    find.mockResolvedValue({ docs: [{ layout: [{ blockType: "formBlock", form: 9 }] }] });
    expect(await isFormPlaced(reader, 9)).toBe(true);
    expect(await isFormPlaced(reader, 8)).toBe(false);
  });

  it("finds no form without a content database", async () => {
    cached = null;
    expect(await isFormPlaced(reader, 1)).toBe(false);
    expect(find).not.toHaveBeenCalled();
  });
});
