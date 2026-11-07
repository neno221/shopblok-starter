// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The loader of the promo code's copy button: a client
// component that fetches `copy-code-control.tsx` when it renders in the browser, so a route
// that may draw the section (since T87 every product and listing page, whose sections are an
// editor's blocks) carries none of its code in its first load; only this small loader is. The
// server still renders it (`ssr` stays on), so the HTML is the same as before. Unit tests load the
// module itself in its place (the `vi.mock` rows in `test-support/setup.ts`).
"use client";

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type { CopyCodeControlProps } from "./copy-code-control";

const CopyCodeControl = lazyIsland<CopyCodeControlProps>(() =>
  import("./copy-code-control").then((module) => module.CopyCodeControl),
);

export { CopyCodeControl };
