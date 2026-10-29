import type { SiteSetting } from "../../payload-types";
import { siteText } from "../site";
import { text } from "../text";
import { richTextOrNull } from "./catalog-content";
import type { LexicalState } from "./resolve/sections";
import { isSaved } from "./shell";

/**
 * The product page's shop texts (D78, T69): the notes under the buy button and the delivery and
 * returns section, from `site-settings` in the market's language. The globals' fallback rule
 * (T61): until the settings are saved, or when they cannot be read (no database), `site.ts`'s
 * texts; once saved, the editor's, so an emptied delivery text takes the section away.
 */
export type ProductPageShopText = {
  notes: string[];
  /** `site.ts`'s paragraphs, the editor's rich text, or no section. */
  delivery: { kind: "text"; paragraphs: string[] } | { kind: "rich"; content: LexicalState } | null;
};

export function productPageShopText(
  global: SiteSetting | null | undefined,
  language: string,
): ProductPageShopText {
  if (!isSaved(global)) {
    const fallback = siteText(language);
    return {
      notes: fallback.productNotes,
      delivery: { kind: "text", paragraphs: fallback.delivery },
    };
  }
  const notes = (global?.productNotes ?? []).flatMap((each) => text(each.note) ?? []);
  const content = richTextOrNull(global?.deliveryAndReturns);
  return { notes, delivery: content === null ? null : { kind: "rich", content } };
}
