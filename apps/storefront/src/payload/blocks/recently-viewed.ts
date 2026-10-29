import { headingField, sectionBlock } from "./section-block";

/**
 * `recentlyViewed` (SPEC §7.4, ADR 0004): the visitor's recently viewed products, which the browser
 * holds; the block has only its heading ("Recently viewed" in the page's language when empty).
 */
export const RecentlyViewedBlock = sectionBlock({
  slug: "recentlyViewed",
  interfaceName: "RecentlyViewedBlock",
  plural: "Recently viewed",
  fields: [headingField],
});
