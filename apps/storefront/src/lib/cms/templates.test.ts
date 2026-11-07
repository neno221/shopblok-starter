import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const findGlobal = vi.fn();
vi.mock("./payload", () => ({
  getPayloadClient: async () => ({ findGlobal }),
}));

import type { Template } from "../../payload-types";
import { readTemplates, TEMPLATE_DEFAULTS, templatesFrom } from "./templates";

// D101 (T79): the `templates` global, read in the market's language and passed on by the pages.

beforeEach(() => {
  vi.stubEnv("PAYLOAD_DATABASE_URL", "postgres://localhost/payload");
  cacheTag.mockClear();
  findGlobal.mockReset();
});

const saved = (doc: Partial<Template>): Template =>
  ({ id: 1, updatedAt: "2026-11-06T12:00:00Z", ...doc }) as Template;

describe("templatesFrom", () => {
  it("is every first variant, the quick view off, the drawer and the quick cart, until it is saved", () => {
    expect(TEMPLATE_DEFAULTS).toEqual({
      productPage: "default",
      listing: "default",
      card: "standard",
      quickView: "off",
      cart: "default",
      miniCart: "drawer",
      quickCart: "dropdown",
      checkout: "default",
      receipt: "default",
    });
    expect(templatesFrom(null)).toEqual(TEMPLATE_DEFAULTS);
    expect(templatesFrom({ id: 1 } as Template)).toEqual(TEMPLATE_DEFAULTS);
  });

  it("takes a saved global's picks, and passes on a value from a later version as it is", () => {
    const choice = templatesFrom(
      saved({
        listing: { variant: "rail", card: "quick-add" },
        cart: { variant: "default", miniCart: "page", quickCart: "off" },
        checkout: { variant: "one-page" as never },
      }),
    );
    expect(choice).toEqual({
      ...TEMPLATE_DEFAULTS,
      listing: "rail",
      card: "quick-add",
      miniCart: "page",
      quickCart: "off",
      checkout: "one-page",
    });
  });
});

describe("readTemplates", () => {
  it("reads the published global in the market's language, tagged global:templates:<locale>", async () => {
    findGlobal.mockResolvedValue(saved({}));
    await readTemplates({ market: { language: "el" }, draft: false });
    expect(findGlobal.mock.calls[0]?.[0]).toMatchObject({
      slug: "templates",
      locale: "el",
      fallbackLocale: "en",
      overrideAccess: false,
      user: null,
      draft: false,
      depth: 0,
    });
    expect(cacheTag.mock.calls).toEqual([["global:templates:el"]]);
  });

  it("is null without a database, and reads nothing", async () => {
    vi.stubEnv("PAYLOAD_DATABASE_URL", "");
    expect(
      await readTemplates({ market: { language: "en" }, draft: false }),
    ).toBeNull();
    expect(findGlobal).not.toHaveBeenCalled();
  });
});
