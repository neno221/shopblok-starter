// Ours (T37, SETUP.md "Listing organisms (T37)"). The listing's columns and gaps, in one place:
// ProductGrid draws its cards in them and LoadingSkeleton draws its placeholder cards in them, so the
// page that is loading and the page that arrives line up and nothing moves when the cards come
// (T36 promised the skeleton this in its header). Two columns under `md`, three from `md` and four
// from `lg`, with a wider gap from `md`. A class that is not a literal in a file Tailwind scans
// does not exist, so the string is written whole here, in a file under `src/`, which the
// stylesheet's `@source` covers.

/** The listing's columns and gaps: two under `md`, three from `md`, four from `lg`. */
export const PRODUCT_GRID =
  "grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4";

/**
 * The width a card's picture is drawn at in those columns, for next/image's `sizes`: a quarter of
 * the window from `lg`, a third from `md`, a half below. A listing with a filter sidebar beside it
 * is narrower than the window, so this asks for a little more than the picture needs, never less.
 */
export const PRODUCT_GRID_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";
