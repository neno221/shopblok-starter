// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The recently viewed block's loader, as
// `lazy-islands.tsx`' are, for the pages' blocks only (`render-blocks.tsx`): a product's or a
// listing's sections cannot hold the block, so their pages do not import this loader.
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copy (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as RecentlyViewedBlockModule from "./recently-viewed-block";

export const RecentlyViewedBlock = lazyIsland(
  () => import("./recently-viewed-block").then((module) => module.RecentlyViewedBlock),
  typeof window === "undefined"
    ? {
        server: (require("./recently-viewed-block") as typeof RecentlyViewedBlockModule)
          .RecentlyViewedBlock,
      }
    : {},
);
