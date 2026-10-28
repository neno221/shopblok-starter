import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheTag = vi.fn();
const cacheLife = vi.fn();
vi.mock("next/cache", () => ({
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: (...args: unknown[]) => cacheLife(...args),
}));
const requestHeaders = new Headers({ cookie: "payload-token=abc" });
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
const auth = vi.fn();
const getPayloadClient = vi.fn(async () => ({ auth }));
vi.mock("./payload", () => ({ getPayloadClient: () => getPayloadClient() }));

import { CMS_LIFE, cmsRead, cmsUnavailable } from "./read";

const load = vi.fn(async (_payload: unknown, query: unknown, slug: string) => ({ query, slug }));
const readPage = cmsRead(load, {
  name: "test:page",
  tags: (locale, slug: string) => [`pages:${locale}`, `page:${slug}`],
});

const greek = { language: "el" };
const editor = { id: 2, collection: "users", role: "editor" };

beforeEach(() => {
  vi.stubEnv("PAYLOAD_DATABASE_URL", "postgres://localhost/payload");
  for (const fn of [cacheTag, cacheLife, auth, load, getPayloadClient]) fn.mockClear();
  auth.mockReset();
});

describe("cmsRead, published", () => {
  it("reads in the market's language, anonymously, with access control on", async () => {
    const result = await readPage({ market: greek, draft: false }, "about");
    expect(result).toEqual({
      slug: "about",
      query: {
        locale: "el",
        fallbackLocale: "en",
        draft: false,
        overrideAccess: false,
        user: null,
      },
    });
    expect(auth).not.toHaveBeenCalled();
  });

  it("caches under the read's tags for the language and arguments, with CMS_LIFE", async () => {
    await readPage({ market: greek, draft: false }, "about");
    expect(cacheTag).toHaveBeenCalledWith("pages:el", "page:about");
    expect(cacheLife).toHaveBeenCalledWith(CMS_LIFE);
    expect(CMS_LIFE).toEqual({ stale: 300, revalidate: 3600, expire: 2_592_000 });
  });
});

describe("cmsRead, Draft Mode", () => {
  it("reads drafts as the signed-in staff member, still with access control on, uncached", async () => {
    auth.mockResolvedValue({ user: editor });
    const result = await readPage({ market: greek, draft: true }, "about");
    expect(auth).toHaveBeenCalledWith({ headers: requestHeaders });
    expect(result?.query).toEqual({
      locale: "el",
      fallbackLocale: "en",
      draft: true,
      overrideAccess: false,
      user: editor,
    });
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it("falls back to the published read when nobody is signed in to Payload", async () => {
    auth.mockResolvedValue({ user: null });
    const result = await readPage({ market: greek, draft: true }, "about");
    expect(result?.query).toMatchObject({ draft: false, user: null, overrideAccess: false });
    expect(cacheTag).toHaveBeenCalled();
  });

  it("falls back to the published read for an integration's API key", async () => {
    auth.mockResolvedValue({ user: { id: 2, collection: "integrations", role: "medusa-sync" } });
    const result = await readPage({ market: greek, draft: true }, "about");
    expect(result?.query).toMatchObject({ draft: false, user: null });
  });
});

describe("cmsRead without a database", () => {
  it("answers null and never loads Payload", async () => {
    vi.stubEnv("PAYLOAD_DATABASE_URL", "");
    expect(await readPage({ market: greek, draft: true }, "about")).toBeNull();
    expect(getPayloadClient).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("counts an unset or empty URL as no database", () => {
    expect(cmsUnavailable({})).toBe(true);
    expect(cmsUnavailable({ PAYLOAD_DATABASE_URL: "" })).toBe(true);
    expect(cmsUnavailable({ PAYLOAD_DATABASE_URL: "postgres://db/payload" })).toBe(false);
  });
});
