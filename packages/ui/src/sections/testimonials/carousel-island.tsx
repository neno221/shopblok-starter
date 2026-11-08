// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The testimonials' `carousel` member, loaded
// (`lazyIsland`) when it is drawn in the browser, so a route that may draw the section (since T87
// every product and listing page, whose sections are an editor's blocks) carries the carousel's
// code only where one is drawn. The server draws its own copy without waiting (`server`). Unit tests load the module in its
// place (`test-support/setup.ts`).
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as TestimonialsCarouselModule from "./carousel";
import type { TestimonialsSectionProps } from "./parts";

const TestimonialsCarousel = lazyIsland<TestimonialsSectionProps>(
  () => import("./carousel").then((module) => module.TestimonialsCarousel),
  // The server's copy (`lazyIsland`'s `server`): the browser's build drops this branch.
  typeof window === "undefined"
    ? { server: (require("./carousel") as typeof TestimonialsCarouselModule).TestimonialsCarousel }
    : {},
);

export { TestimonialsCarousel };
