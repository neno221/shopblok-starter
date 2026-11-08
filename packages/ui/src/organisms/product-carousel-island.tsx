// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). ProductCarousel as the product collection
// section draws it: loaded (`lazyIsland`) when a section with a carousel is drawn in the browser,
// so a route that may draw such a section (since T87 every listing page, whose sections are an
// editor's blocks) carries the carousel's code (Embla, its buttons, its status line) only where one
// is drawn. The server draws its own copy without waiting (`server`). The product page's own rows import ProductCarousel
// itself. Unit tests load the module in its place (`test-support/setup.ts`).
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as ProductCarouselModule from "./product-carousel";
import type { ProductCarouselProps } from "./product-carousel";

const ProductCarousel = lazyIsland<ProductCarouselProps>(
  () => import("./product-carousel").then((module) => module.ProductCarousel),
  // The server's copy (`lazyIsland`'s `server`): the browser's build drops this branch.
  typeof window === "undefined"
    ? { server: (require("./product-carousel") as typeof ProductCarouselModule).ProductCarousel }
    : {},
);

export { ProductCarousel };
