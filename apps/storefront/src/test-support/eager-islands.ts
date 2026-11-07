import { vi } from "vitest";

// T87 (D102): the blocks' islands load through `next/dynamic` once they render in a browser
// (`components/cms/lazy-islands.tsx`, and `@shopblok/ui`'s `*-island.tsx` loaders), which a test's
// render would not wait for, and which `renderToStaticMarkup` cannot render at all. Tests draw the
// modules themselves in their place; the loaders are checked by the build (`first-load.ts`'
// `keptOut`) and by the e2e suites.
vi.mock("../components/cms/lazy-islands", async () => ({
  ...(await import("../components/cms/form-block-island")),
  ...(await import("../components/cms/newsletter-section-island")),
  ...(await import("../components/cms/offer-end")),
  ...(await import("../components/cms/promo-popup")),
  ...(await import("../components/cms/recently-viewed-block")),
}));
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
