// @vitest-environment happy-dom
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { listingResultsCopy } from "@shopblok/ui/templates/listing-results";
import { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// T84 (PR 118 review, item 1): the island's layouts. A layout's code is loaded the first time the
// island draws it; one whose chunk does not load (here the `top-bar` module's import rejects, as it
// does after a deploy took the old build's files away) draws the default layout's results, not the
// route's error page.
vi.mock("@shopblok/ui/templates/listing-layouts/top-bar", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

import { LayoutResults } from "./listing-layouts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const results = pageFixtures.en.productListing.results;

let root: Root;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const layoutDrawn = () =>
  container.querySelector('[data-slot="listing-results"]')?.getAttribute("data-layout");

async function draw(layout: string | undefined) {
  await act(async () =>
    root.render(
      <Suspense fallback={<p data-slot="loading" />}>
        <LayoutResults
          {...results}
          layout={layout}
          copy={listingResultsCopy(catalogs.en)}
          locale="en-US"
          hrefFor={(n) => `/us/store?page=${n}`}
          prefetch={false}
        />
      </Suspense>,
    ),
  );
  // The lazy import settles on a later task (a cold one takes a while to transform in a full run).
  for (let wait = 0; wait < 250 && layoutDrawn() === undefined; wait++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
}

describe("the island's layouts (T84)", () => {
  it("draws a layout's own results once its code has loaded", async () => {
    await draw("chips");
    expect(layoutDrawn()).toBe("chips");
  });

  it("draws the default layout for no layout or one it does not know", async () => {
    await draw(undefined);
    expect(layoutDrawn()).toBe("default");
    await draw("toString");
    expect(layoutDrawn()).toBe("default");
  });

  it("draws the default layout when a layout's code does not load, not the error page", async () => {
    await draw("top-bar");
    expect(layoutDrawn()).toBe("default");
    expect(container.querySelector('[data-slot="product-card"]')).not.toBeNull();
  });
});
