import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// T87 (D102): the islands' loaders fetch their module with `next/dynamic` once they render in a
// browser, which a test's render would not wait for. Tests draw the module itself in its place;
// the loaders are checked by the build (`first-load.ts`' `keptOut`) and by the DS's checks.
vi.mock(
  "@shopblok/ui/molecules/countdown-clock-island",
  () => import("@shopblok/ui/molecules/countdown-clock"),
);
vi.mock(
  "@shopblok/ui/molecules/copy-code-control-island",
  () => import("@shopblok/ui/molecules/copy-code-control"),
);
vi.mock(
  "@shopblok/ui/sections/video-embed-island",
  () => import("@shopblok/ui/sections/video-embed"),
);
vi.mock(
  "@shopblok/ui/organisms/product-carousel-island",
  () => import("@shopblok/ui/organisms/product-carousel"),
);
vi.mock(
  "@shopblok/ui/sections/category-showcase/carousel-island",
  () => import("@shopblok/ui/sections/category-showcase/carousel"),
);
vi.mock(
  "@shopblok/ui/sections/testimonials/carousel-island",
  () => import("@shopblok/ui/sections/testimonials/carousel"),
);
