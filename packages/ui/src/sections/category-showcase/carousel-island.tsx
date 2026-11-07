// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The category showcase's `carousel` member,
// loaded (`lazyIsland`) when it is drawn in the browser, so a route that may draw the section
// (since T87 every product and listing page, whose sections are an editor's blocks) carries the
// carousel's code only where one is drawn. The server draws its own copy without waiting
// (`server`). Unit tests load the module in its place (`test-support/setup.ts`).
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as CategoryShowcaseCarouselModule from "./carousel";
import type { CategoryShowcaseSectionProps } from "./standard";

const CategoryShowcaseCarousel = lazyIsland<CategoryShowcaseSectionProps>(
  () => import("./carousel").then((module) => module.CategoryShowcaseCarousel),
  // The server's copy (`lazyIsland`'s `server`): the browser's build drops this branch.
  typeof window === "undefined"
    ? {
        server: (require("./carousel") as typeof CategoryShowcaseCarouselModule)
          .CategoryShowcaseCarousel,
      }
    : {},
);

export { CategoryShowcaseCarousel };
