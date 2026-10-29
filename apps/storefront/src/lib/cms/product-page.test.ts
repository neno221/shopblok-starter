import { describe, expect, it } from "vitest";
import type { SiteSetting } from "../../payload-types";
import { siteText } from "../site";
import { productPageShopText } from "./product-page";

// T69 (D78): the product page's notes and delivery text come from `site-settings`, with T61's
// fallback rule.

const paragraph = (text: string) => ({
  type: "paragraph",
  version: 1,
  children: text === "" ? [] : [{ type: "text", text, version: 1 }],
});
const rich = (...texts: string[]) =>
  ({
    root: { type: "root", version: 1, children: texts.map(paragraph) },
  }) as unknown as SiteSetting["deliveryAndReturns"];
const saved = (fields: Partial<SiteSetting>) =>
  ({ id: 1, updatedAt: "2026-10-29T10:00:00.000Z", ...fields }) as SiteSetting;

describe("productPageShopText", () => {
  it("gives site.ts's texts in the market's language until the settings are saved, or without them", () => {
    for (const global of [null, undefined, { id: 1 } as SiteSetting]) {
      expect(productPageShopText(global, "el")).toEqual({
        notes: siteText("el").productNotes,
        delivery: { kind: "text", paragraphs: siteText("el").delivery },
      });
    }
  });

  it("once saved, gives the editor's notes (blank ones left out) and rich delivery text", () => {
    const delivery = rich("Delivered in 3 days.");
    expect(
      productPageShopText(
        saved({
          productNotes: [{ note: "Made in Portugal" }, { note: "  " }, { note: "Free returns" }],
          deliveryAndReturns: delivery,
        }),
        "en",
      ),
    ).toEqual({
      notes: ["Made in Portugal", "Free returns"],
      delivery: { kind: "rich", content: delivery },
    });
  });

  it("an emptied delivery text and no notes take them away, not back to site.ts's", () => {
    expect(
      productPageShopText(saved({ productNotes: [], deliveryAndReturns: rich("") }), "en"),
    ).toEqual({ notes: [], delivery: null });
  });
});
