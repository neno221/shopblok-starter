import { vi } from "vitest";
import "@shopblok/ui/test-support/eager-islands";

// T87 (D102): the blocks' islands (`components/cms/lazy-islands.tsx` and `lazy-page-islands.tsx`)
// load their module through `lazyIsland` (`React.lazy`) once they render in a browser, which a
// test's render would not wait for. Tests draw the modules themselves in their place, as
// `@shopblok/ui`'s list above does for its loaders; the loaders are checked by the build
// (`first-load.ts`' `keptOut`) and by the e2e suites.
vi.mock("../components/cms/lazy-islands", async () => ({
  ...(await import("../components/cms/form-block-island")),
  ...(await import("../components/cms/newsletter-section-island")),
  ...(await import("../components/cms/offer-end")),
  ...(await import("../components/cms/promo-popup")),
}));
vi.mock(
  "../components/cms/lazy-page-islands",
  () => import("../components/cms/recently-viewed-block"),
);
