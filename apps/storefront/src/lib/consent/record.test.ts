import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
import { retentionCutoff } from "../../payload/jobs/consent-retention";

// M7 D145 (T109): the server's record of a cookie choice.
const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));
const created: Record<string, unknown>[] = [];
const found: Record<string, unknown>[] = [];
const payload = {
  find: vi.fn(async () => ({ docs: found.slice(-1) })),
  create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    created.push(data);
    found.push(data);
    return data;
  }),
};
vi.mock("../cms/payload", () => ({ getPayloadClient: async () => payload }));
const consumeLimit = vi.hoisted(() =>
  vi.fn(async (): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> => ({
    allowed: true,
  })),
);
vi.mock("../security/rate-limit", () => ({ consumeLimit }));

const market = {
  key: "el-cy",
  country: "cy",
  language: "el",
  htmlLang: "el-CY",
  medusaLocale: "el-GR",
  isDefaultLanguage: true,
};

describe("the consent record (D145)", () => {
  beforeEach(() => {
    jar.reset();
    created.length = 0;
    found.length = 0;
    consumeLimit.mockClear();
  });

  it("names a first choice given, a later one changed, and one that turns a category off withdrawn", async () => {
    const { kindOf } = await import("./record");
    expect(kindOf(undefined, { analytics: true, marketing: false })).toBe("given");
    expect(
      kindOf({ analytics: false, marketing: false }, { analytics: true, marketing: false }),
    ).toBe("changed");
    expect(
      kindOf({ analytics: true, marketing: true }, { analytics: true, marketing: false }),
    ).toBe("withdrawn");
  });

  it("keeps one record per choice under one id, which the cookie keeps, and nothing that identifies the visitor", async () => {
    const { keepConsent } = await import("./record");
    const both = { analytics: true, marketing: true };
    const first = await keepConsent(market, both, { setCookie: true });
    expect(first).toMatchObject({ kept: true, kind: "given" });
    const id = first.id;
    expect(jar.values.get("_shopblok_consent")).toMatch(
      new RegExp(`^v1\\.1\\.1\\.\\d{4}-\\d{2}-\\d{2}\\.${id}$`),
    );
    expect(await keepConsent(market, both, { setCookie: true })).toMatchObject({
      kept: true,
      id,
      kind: "changed",
    });
    expect(
      await keepConsent(market, { analytics: false, marketing: true }, { setCookie: true }),
    ).toMatchObject({ kept: true, id, kind: "withdrawn" });
    expect(created.map((each) => each.consentId)).toEqual([id, id, id]);
    expect(Object.keys(created[0] ?? {}).sort()).toEqual(
      ["analytics", "consentId", "kind", "language", "market", "marketing", "policyVersion"].sort(),
    );
    expect(created[2]).toEqual({
      consentId: id,
      kind: "withdrawn",
      analytics: false,
      marketing: true,
      policyVersion: 1,
      market: "el-cy",
      language: "el",
    });
    expect(consumeLimit).toHaveBeenCalledWith("consent");
  });

  it("records the island's choice as passed, under the cookie's id, and writes no cookie (PR 156 review)", async () => {
    const { keepConsent } = await import("./record");
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    // The request's cookie says what it said when the action was sent; the visitor has since
    // withdrawn, and the island passes that.
    jar.reset({ _shopblok_consent: `v1.1.1.2026-11-12.${id}` });
    const kept = await keepConsent(
      market,
      { analytics: false, marketing: false },
      { setCookie: false },
    );
    expect(kept).toMatchObject({ kept: true, id });
    expect(created.at(-1)).toMatchObject({ consentId: id, analytics: false, marketing: false });
    expect(jar.values.get("_shopblok_consent")).toBe(`v1.1.1.2026-11-12.${id}`);
    expect(jar.writes).toEqual([]);
    // The first choice: a new id, answered for the browser to add.
    jar.reset({ _shopblok_consent: "v1.1.0.2026-11-12" });
    const first = await keepConsent(
      market,
      { analytics: true, marketing: false },
      { setCookie: false },
    );
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.id).not.toBe(id);
    expect(jar.values.get("_shopblok_consent")).toBe("v1.1.0.2026-11-12");
  });

  it("records nothing over the limit (the cookie still holds the choice), and still answers the id", async () => {
    const { keepConsent } = await import("./record");
    consumeLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });
    expect(
      await keepConsent(market, { analytics: false, marketing: false }, { setCookie: true }),
    ).toMatchObject({ kept: false, reason: "too-many", id: expect.any(String) });
    expect(jar.values.get("_shopblok_consent")).toMatch(/^v1\.0\.0\./);
    expect(created).toEqual([]);
  });

  it("deletes records older than 13 months", () => {
    expect(retentionCutoff(new Date("2027-12-26T10:00:00Z")).toISOString()).toBe(
      "2026-11-26T10:00:00.000Z",
    );
  });
});
