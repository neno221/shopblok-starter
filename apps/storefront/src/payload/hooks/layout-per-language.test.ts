import { describe, expect, it, vi } from "vitest";
import {
  copyBlocks,
  copyLayoutIntoOtherLanguages,
  copyLayoutOnSwitch,
} from "./layout-per-language";

type BeforeArgs = Parameters<typeof copyLayoutOnSwitch>[0];
type AfterArgs = Parameters<typeof copyLayoutIntoOtherLanguages>[0];

const ID = /^[0-9a-f]{24}$/;
const block = (heading: string) => ({
  id: "6aef08318c2a371af14e86c3",
  blockType: "faq",
  heading,
  image: 7,
  items: [{ id: "6aef08318c2a371af14e86c4", question: "Why?" }],
});

/**
 * A page in English, Greek and German (each has a slug), its shared layout's heading in each
 * language as a visitor reads it, and the languages that already have blocks of their own.
 */
function payloadFor(own: Record<string, unknown[]> = {}) {
  const findByID = vi.fn(
    async ({ locale, fallbackLocale }: { locale: string; fallbackLocale: string | false }) => {
      if (locale === "all") return { slug: { en: "about", el: "sxetika", de: "uber" } };
      return {
        layout: [block(`Heading ${locale}${fallbackLocale === false ? "" : "+fallback"}`)],
        localizedLayout: own[locale] ?? [],
      };
    },
  );
  return { findByID, update: vi.fn(async () => ({})) };
}

const request = (locale: string, payload: unknown = payloadFor()) => ({
  locale,
  context: {} as Record<string, unknown>,
  payload,
});

const before = (data: Record<string, unknown>, originalDoc: unknown, req: unknown) =>
  copyLayoutOnSwitch({ data, originalDoc, req } as unknown as BeforeArgs) as Promise<
    Record<string, unknown>
  >;

const after = (doc: Record<string, unknown>, req: unknown) =>
  copyLayoutIntoOtherLanguages({ doc, req } as unknown as AfterArgs);

describe("copyBlocks", () => {
  it("copies the blocks with new ids for the blocks and their rows, and keeps relationship ids", () => {
    const original = block("Questions");
    const [copy] = copyBlocks([original]) as (typeof original)[];
    expect(copy).toMatchObject({ blockType: "faq", heading: "Questions", image: 7 });
    expect(copy?.id).toMatch(ID);
    expect(copy?.id).not.toBe(original.id);
    expect(copy?.items[0]?.id).toMatch(ID);
    expect(copy?.items[0]?.id).not.toBe(original.items[0]?.id);
    expect(copy?.items[0]?.question).toBe("Why?");
  });
});

describe("copyLayoutOnSwitch (D105)", () => {
  it("copies the layout being saved into English's own when the switch goes on in English", async () => {
    const req = request("en");
    const data = await before(
      { layoutPerLanguage: true, layout: [block("Questions")] },
      { id: 1, layoutPerLanguage: false },
      req,
    );
    expect(data["localizedLayout"]).toEqual([expect.objectContaining({ heading: "Questions" })]);
    expect(req.context["copyLayoutIntoOtherLanguages"]).toBe(true);
  });

  it("copies the saved layout with English's text where the language has none, in another language", async () => {
    const data = await before(
      { layoutPerLanguage: true, layout: [block("")] },
      { id: 1, layoutPerLanguage: false },
      request("el"),
    );
    expect(data["localizedLayout"]).toEqual([
      expect.objectContaining({ heading: "Heading el+fallback" }),
    ]);
  });

  it("copies once: not while the switch stays on or goes off, and not over blocks of the language's own", async () => {
    const own = [{ blockType: "spacer", id: "6aef08318c2a371af14e86c5" }];
    for (const [data, original] of [
      [
        { layoutPerLanguage: true, layout: [block("Q")] },
        { id: 1, layoutPerLanguage: true },
      ],
      [
        { layoutPerLanguage: false, layout: [block("Q")] },
        { id: 1, layoutPerLanguage: false },
      ],
    ] as const) {
      const req = request("en");
      expect((await before({ ...data }, original, req))["localizedLayout"]).toBeUndefined();
      expect(req.context["copyLayoutIntoOtherLanguages"]).toBeUndefined();
    }
    const kept = await before(
      { layoutPerLanguage: true, layout: [block("Q")], localizedLayout: own },
      { id: 1, layoutPerLanguage: false },
      request("en"),
    );
    expect(kept["localizedLayout"]).toBe(own);
    const greek = await before(
      { layoutPerLanguage: true },
      { id: 1, layoutPerLanguage: false },
      request("el", payloadFor({ el: own })),
    );
    expect(greek["localizedLayout"]).toBeUndefined();
  });
});

describe("copyLayoutIntoOtherLanguages (D105)", () => {
  it("does nothing unless the switch went on in this save", async () => {
    const payload = payloadFor();
    await after({ id: 1, _status: "draft" }, request("el", payload));
    expect(payload.findByID).not.toHaveBeenCalled();
  });

  it("copies into English and every other translated language, as drafts after a draft and publishes after a publish", async () => {
    for (const [status, draft] of [
      ["draft", true],
      ["published", false],
    ] as const) {
      const payload = payloadFor();
      const req = request("el", payload);
      req.context["copyLayoutIntoOtherLanguages"] = true;
      await after({ id: 1, _status: status }, req);
      const saved = payload.update.mock.calls.map(([call]) => call) as unknown as {
        locale: string;
        draft: boolean;
        data: { localizedLayout: { heading: string }[] };
      }[];
      // English first, then German; Greek's copy was part of the save itself.
      expect(saved.map((call) => call.locale)).toEqual(["en", "de"]);
      expect(saved.every((call) => call.draft === draft)).toBe(true);
      expect(saved.map((call) => call.data.localizedLayout[0]?.heading)).toEqual([
        "Heading en+fallback",
        "Heading de+fallback",
      ]);
      // The language being edited is put back on the request for the hooks after this one.
      expect(req.locale).toBe("el");
      expect(req.context["copyLayoutIntoOtherLanguages"]).toBeUndefined();
    }
  });

  it("keeps the blocks a language already has of its own", async () => {
    const payload = payloadFor({ en: [{ blockType: "spacer" }] });
    const req = request("el", payload);
    req.context["copyLayoutIntoOtherLanguages"] = true;
    await after({ id: 1, _status: "draft" }, req);
    expect(payload.update.mock.calls.map(([call]) => (call as { locale: string }).locale)).toEqual([
      "de",
    ]);
  });
});
