// Ours (T87, SETUP.md "Catalog sections (T87)"; D102, D104). The islands of the blocks a section may
// hold, as `section-blocks.tsx` draws them: each loaded (`lazyIsland`, React's `lazy` without
// `next/dynamic`'s runtime) when a block that needs it is drawn, so a route that may draw blocks (a
// page, the home, and since T87 every product and listing page, whose sections are an editor's
// blocks) carries none of their code in its first load; only this small loader is. The pages'
// recently viewed row has its own loader (`lazy-page-islands.tsx`), which the product and listing
// pages do not import. `lazyIsland()` is called here, in a client component, never in a server one
// (T77's probe: there it would put the module back in the first load). The server draws each
// island from its own copy (`server`, a `require` in a branch the browser's build drops), in place
// and without waiting, so the HTML, and what works without scripts (a form's post and its answer,
// the offer's text), is unchanged; the browser fetches an island's code as it hydrates the block.
// `first-load.ts`'s `keptOut` checks that none of them is in a shop route's first load.
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as FormBlockIslandModule from "./form-block-island";
import type * as NewsletterSectionIslandModule from "./newsletter-section-island";
import type * as OfferEndModule from "./offer-end";
import type * as PromoPopupModule from "./promo-popup";

export const FormBlockIsland = lazyIsland(
  () => import("./form-block-island").then((module) => module.FormBlockIsland),
  typeof window === "undefined"
    ? { server: (require("./form-block-island") as typeof FormBlockIslandModule).FormBlockIsland }
    : {},
);

export const NewsletterSectionIsland = lazyIsland(
  () => import("./newsletter-section-island").then((module) => module.NewsletterSectionIsland),
  typeof window === "undefined"
    ? {
        server: (require("./newsletter-section-island") as typeof NewsletterSectionIslandModule)
          .NewsletterSectionIsland,
      }
    : {},
);

export const OfferEnd = lazyIsland(
  () => import("./offer-end").then((module) => module.OfferEnd),
  typeof window === "undefined"
    ? { server: (require("./offer-end") as typeof OfferEndModule).OfferEnd }
    : {},
);

export const PromoPopup = lazyIsland(
  () => import("./promo-popup").then((module) => module.PromoPopup),
  typeof window === "undefined"
    ? { server: (require("./promo-popup") as typeof PromoPopupModule).PromoPopup }
    : {},
);
