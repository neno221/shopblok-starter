import type { Context } from "../context";
import type { CommerceFixture } from "../types";

/**
 * EmptyState's three samples (T33): filters that match nothing (the way out is the Hoodies listing
 * without its filters), a search with no result (back to the shop's home), and a category with no
 * product yet (nothing to do, so no action).
 */
export function buildEmptyStates(ctx: Context): CommerceFixture["emptyStates"] {
  const { filters, search, category } = ctx.copy.emptyStates;
  return {
    filters: {
      title: filters.title,
      text: filters.text,
      action: { label: filters.action, href: ctx.categoryHref("women", "clothing", "hoodies") },
    },
    search: {
      title: search.title,
      text: search.text,
      action: { label: search.action, href: ctx.root },
    },
    category: { title: category.title, text: category.text },
  };
}
