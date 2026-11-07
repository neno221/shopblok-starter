// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100, D102). The `tabs` product
// collection's island: its sources as Base UI tabs over one grid of cards each. The first tab's
// products come with the page (they are in its HTML too, for a visitor without scripts and a
// crawler); another tab's are fetched the first time it is chosen, from the tab's `endpoint` (the
// shop's `/next/block-tab`, which reads the published page and resolves the tab's source in the
// market's region), and kept for the page's life. While they load the panel says so in a polite
// live region; when they cannot be loaded it says so, with "Try again". A tab that came with its
// products (the design system's) fetches nothing. The arrow keys move between the tabs and show
// each one's panel as it is reached (automatic activation: the answer is the catalog's, cached a
// minute, so a panel is there almost at once); nothing changes by itself (D100, WCAG 2.2.2). The tab
// list is named by the section's heading. Loaded by `next/dynamic` in `tabs-island.tsx`, so its
// code is no route's first load (D102): its `displayName` is the marker `first-load.ts`' `keptOut`
// finds its chunk by. Drawn, the tabs hide the section's list of the tabs' links and the first
// grid through the `:has()` rule on their wrapper, so nothing is drawn twice. Its grid is
// ProductGrid, the module the listing island draws its results with: an island with a card module
// of its own split the listings' and the product page's first-load chunks, 150 and 570 bytes more.
"use client";

import type { ProductCard, ProductCollectionTab } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shopblok/ui/primitives/tabs";
import type { SectionProductsCopy, SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { useEffect, useRef, useState } from "react";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";

type ProductCollectionTabsPanelsProps = {
  tabs: readonly ProductCollectionTab[];
  /** The first tab's products: the section's, in the page. */
  first: readonly ProductCard[];
  /** The section heading's id: the tab list's name. */
  labelledBy: string;
  copy: { products: SectionProductsCopy; tabs: SectionsCopy["tabs"] };
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The browser's `fetch`; a test passes its own. */
  fetcher?: typeof fetch;
};

/** A tab's products: there, on their way, or not to be had. */
type Loaded =
  { state: "done"; products: readonly ProductCard[] } | { state: "loading" } | { state: "failed" };

function isAnswer(body: unknown): body is { products: ProductCard[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { products?: unknown }).products)
  );
}

function ProductCollectionTabsPanels({
  tabs,
  first,
  labelledBy,
  copy,
  locale,
  prefetch,
  fetcher,
}: ProductCollectionTabsPanelsProps) {
  const [active, setActive] = useState(0);
  // Each tab's products by index: the first's from the page, the others' as they come.
  const [loaded, setLoaded] = useState<Partial<Record<number, Loaded>>>(() => {
    const given: Partial<Record<number, Loaded>> = { 0: { state: "done", products: first } };
    tabs.forEach((tab, index) => {
      if (index > 0 && tab.products !== undefined)
        given[index] = { state: "done", products: tab.products };
    });
    return given;
  });

  // The fetches on their way, stopped if the section goes before they answer.
  const pending = useRef(new Set<AbortController>());
  useEffect(() => {
    const running = pending.current;
    return () => {
      for (const controller of running) controller.abort();
    };
  }, []);

  /** Fetches tab `index`'s products from its endpoint, once at a time. */
  function load(index: number) {
    const endpoint = tabs[index]?.endpoint;
    if (endpoint === undefined) return;
    const controller = new AbortController();
    pending.current.add(controller);
    setLoaded((all) => ({ ...all, [index]: { state: "loading" } }));
    (fetcher ?? fetch)(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const body: unknown = response.ok ? await response.json() : null;
        setLoaded((all) => ({
          ...all,
          [index]:
            isAnswer(body) && body.products.length > 0
              ? { state: "done", products: body.products }
              : { state: "failed" },
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("product collection tabs: a tab's products could not be loaded", error);
        setLoaded((all) => ({ ...all, [index]: { state: "failed" } }));
      })
      .finally(() => pending.current.delete(controller));
  }

  /** A tab chosen for the first time asks for its products. */
  function choose(value: unknown) {
    const index = Number(value);
    setActive(index);
    if (loaded[index] === undefined) load(index);
  }

  return (
    <Tabs
      data-slot="product-collection-tabs"
      value={active}
      onValueChange={choose}
      className="gap-6"
    >
      <TabsList
        aria-labelledby={labelledBy}
        activateOnFocus
        variant="line"
        className="w-full flex-wrap justify-start"
      >
        {tabs.map((tab, index) => (
          <TabsTrigger
            key={`${index} ${tab.href}`}
            value={index}
            data-slot="product-collection-tab"
            className="flex-none px-3 text-base wrap-anywhere"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, index) => {
        const each = loaded[index];
        return (
          <TabsContent
            key={`${index} ${tab.href}`}
            value={index}
            data-slot="product-collection-panel"
            data-state={each?.state ?? "loading"}
            className="min-w-0"
          >
            {each?.state === "done" ? (
              <ProductGrid
                products={[...each.products]}
                variant="standard"
                layout="grid"
                // Never drawn: a tab's answer has products (the route's 404 says it has none).
                empty={{ title: tab.label }}
                copy={copy.products}
                locale={locale}
                prefetch={prefetch}
              />
            ) : each?.state === "failed" ? (
              <div role="alert" className="flex flex-col items-start gap-3 py-8 text-base">
                <p className="font-medium">{copy.tabs.failed.title}</p>
                <p className="text-muted-foreground">{copy.tabs.failed.text}</p>
                <Button type="button" variant="outline" onClick={() => load(index)}>
                  {copy.tabs.failed.retry}
                </Button>
              </div>
            ) : (
              <p role="status" className="py-8 text-base text-muted-foreground">
                {copy.tabs.loading}
              </p>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
ProductCollectionTabsPanels.displayName = "shopblok:product-collection-tabs";

export default ProductCollectionTabsPanels;
export { ProductCollectionTabsPanels };
export type { ProductCollectionTabsPanelsProps };
