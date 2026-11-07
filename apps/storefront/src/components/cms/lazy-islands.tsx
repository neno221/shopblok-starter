// Ours (T87, SETUP.md "Catalog sections (T87)"; D102, D104). The blocks' islands as `RenderBlocks`
// draws them: each loaded (`lazyIsland`, React's `lazy` without `next/dynamic`'s runtime) when a block that needs it is drawn, so a route that
// may draw blocks (a page, the home, and since T87 every product and listing page, whose sections
// are an editor's blocks) carries none of their code in its first load; only this small loader is.
// `lazyIsland()` is called here, in a client component, never in a server one (T77's probe: there
// it would put the module back in the first load). The server still renders each island as before
// (`ssr` stays on), so the HTML, and what works without scripts (a form's post, the offer's text),
// is unchanged; the browser fetches an island's code as it hydrates the block. `first-load.ts`'s
// `keptOut` checks that none of them is in a shop route's first load.
"use client";

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";

export const FormBlockIsland = lazyIsland(() =>
  import("./form-block-island").then((module) => module.FormBlockIsland),
);

export const NewsletterSectionIsland = lazyIsland(() =>
  import("./newsletter-section-island").then((module) => module.NewsletterSectionIsland),
);

export const OfferEnd = lazyIsland(() => import("./offer-end").then((module) => module.OfferEnd));

export const PromoPopup = lazyIsland(() =>
  import("./promo-popup").then((module) => module.PromoPopup),
);

export const RecentlyViewedBlock = lazyIsland(() =>
  import("./recently-viewed-block").then((module) => module.RecentlyViewedBlock),
);
