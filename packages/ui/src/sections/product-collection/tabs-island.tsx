// Ours (T81, SETUP.md "Catalog block variants (T81)"; D102). The loader of the `tabs` product
// collection's island: a client component whose `next/dynamic` fetches the tabs' module
// (`tabs-panels.tsx`) when it renders in the browser, so that module is no route's first load; only
// this small loader is (T77's probe: `dynamic()` must be called in a client component, never in a
// server one). The server renders nothing here (`ssr: false`): its HTML has the list of the tabs'
// links and the first tab's products, which the tabs replace once they are drawn.
"use client";

import dynamic from "next/dynamic";
import type { ProductCollectionTabsPanelsProps } from "./tabs-panels";

const ProductCollectionTabsPanels = dynamic(() => import("./tabs-panels"), { ssr: false });

function ProductCollectionTabsIsland(props: ProductCollectionTabsPanelsProps) {
  return <ProductCollectionTabsPanels {...props} />;
}

export { ProductCollectionTabsIsland };
