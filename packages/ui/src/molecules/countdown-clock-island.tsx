// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The loader of the countdown's ticking clock (the hero's and the promo banner's): a client
// component that fetches `countdown-clock.tsx` when it renders in the browser, so a route
// that may draw the section (since T87 every product and listing page, whose sections are an
// editor's blocks) carries none of its code in its first load; only this small loader is. The
// server draws its own copy without waiting (`server`), so the HTML is the same as before. Unit tests load the
// module itself in its place (the `vi.mock` rows in `test-support/setup.ts`).
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as CountdownClockModule from "./countdown-clock";
import type { CountdownClockProps } from "./countdown-clock";

const CountdownClock = lazyIsland<CountdownClockProps>(
  () => import("./countdown-clock").then((module) => module.CountdownClock),
  // The server's copy (`lazyIsland`'s `server`): the browser's build drops this branch.
  typeof window === "undefined"
    ? { server: (require("./countdown-clock") as typeof CountdownClockModule).CountdownClock }
    : {},
);

export { CountdownClock };
