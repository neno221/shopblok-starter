import "server-only";
import type { BuyBox } from "@shopblok/registry/contracts";
import type { QuickViewDialogProps } from "@shopblok/ui/organisms/quick-view-dialog";
import { productDetailCopy } from "@shopblok/ui/templates/product-detail";
import { messagesFor } from "../../i18n/market-messages";
import { productPageShopText } from "../cms/product-page";
import { cmsOrNull } from "../cms/read";
import { readSiteSettings } from "../cms/site";
import { getMarketContext } from "../market-context";
import { MedusaRequestError } from "../medusa/sdk";
import { readMarketProduct } from "../product-read";
import { productBuyBox } from "../view-models/product-page";
import { CATALOG_HEADERS } from "./handlers";

// D101, D102 (T83): the quick view's product, for the listing's dialog, which asks for it on the
// first press of a card's button. The catalog's answer, never a visitor's: the market's region and
// language only, from the market's key (`getMarketContext`; never a region or a language from the
// query or a cookie, PR 113's review), the product as its page reads it (`readMarketProduct`, the
// same reader, tagged `product:<handle>`, with the shop's pictures and notes, published), so
// a shared cache may keep it a minute, as `/next/listing`'s. No cookie is read, and anything that is
// not a product this market sells (no market, no handle, a product with no price in the region) is
// a 404, the answer the product's page gives.

/** What `/next/quick-view` answers: the dialog's buy box, its words and the market's language. */
export type QuickViewAnswer = {
  box: BuyBox;
  copy: QuickViewDialogProps["copy"];
  /** The market's `<html lang>`. */
  locale: string;
};

const nothing = (status: number) =>
  Response.json(null, { status, headers: { "Cache-Control": "no-store" } });

/** The answer for a market's key and a product's handle, or `null` for a 404. */
export async function readQuickView(
  market: string,
  handle: string,
): Promise<QuickViewAnswer | null> {
  if (market === "" || handle === "") return null;
  const context = await getMarketContext(market);
  if (context === null) return null;
  const current = context.market;
  const [messages, settings] = await Promise.all([
    messagesFor(current),
    cmsOrNull(readSiteSettings({ market: current, draft: false }), "quick view: site.ts's notes"),
  ]);
  const read = await readMarketProduct(context, messages, handle, {
    draft: false,
    from: "quick view",
  });
  if (read === null) return null;
  const { organisms } = messages;
  return {
    box: productBuyBox(read.detail, productPageShopText(settings, current.language).notes),
    copy: {
      ...productDetailCopy(messages).buyBox,
      quickViewDialog: organisms.quickViewDialog,
      productGallery: organisms.productGallery,
    },
    locale: current.htmlLang,
  };
}

/** `GET /next/quick-view?market=&handle=`: the quick view's product, or 404 (503 with Medusa down). */
export async function quickViewResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  try {
    const answer = await readQuickView(
      params.get("market") ?? "",
      (params.get("handle") ?? "").slice(0, 200),
    );
    return answer === null ? nothing(404) : Response.json(answer, { headers: CATALOG_HEADERS });
  } catch (error) {
    if (error instanceof MedusaRequestError) return nothing(503);
    throw error;
  }
}
