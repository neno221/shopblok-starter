import { vi } from "vitest";

// T87 (D102): the islands' loaders (`lazyIsland`, on `React.lazy`) fetch their module once they
// render in a browser, which a test's render would not wait for. Tests draw the module itself in
// its place; the loaders are checked by `lib/lazy-island.test.tsx`, by the build
// (`first-load.ts`' `keptOut`) and by the e2e suites. The one list of `@shopblok/ui`'s loaders:
// this package's setup and the storefront's import it, so a new loader is mocked in both.
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
