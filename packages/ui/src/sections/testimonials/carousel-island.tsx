// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The testimonials' `carousel` member, loaded
// (`lazyIsland`) when it is drawn in the browser, so a route that may draw the section (since T87
// every product and listing page, whose sections are an editor's blocks) carries the carousel's
// code only where one is drawn. The server renders it as before. Unit tests load the module in its
// place (`test-support/setup.ts`).
"use client";

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type { TestimonialsSectionProps } from "./parts";

const TestimonialsCarousel = lazyIsland<TestimonialsSectionProps>(() =>
  import("./carousel").then((module) => module.TestimonialsCarousel),
);

export { TestimonialsCarousel };
