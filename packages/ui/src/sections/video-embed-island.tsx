// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). The loader of the video's play button and its player: a client
// component that fetches `video-embed.tsx` when it renders in the browser, so a route
// that may draw the section (since T87 every product and listing page, whose sections are an
// editor's blocks) carries none of its code in its first load; only this small loader is. The
// server draws its own copy without waiting (`server`), so the HTML is the same as before. Unit tests load the
// module itself in its place (the `vi.mock` rows in `test-support/setup.ts`).
"use client";
/* eslint-disable @typescript-eslint/no-require-imports -- the server's copies (`lazyIsland`'s `server`) */

import { lazyIsland } from "@shopblok/ui/lib/lazy-island";
import type * as VideoEmbedModule from "./video-embed";
import type { VideoEmbedProps } from "./video-embed";

const VideoEmbed = lazyIsland<VideoEmbedProps>(
  () => import("./video-embed").then((module) => module.VideoEmbed),
  // The server's copy (`lazyIsland`'s `server`): the browser's build drops this branch.
  typeof window === "undefined"
    ? { server: (require("./video-embed") as typeof VideoEmbedModule).VideoEmbed }
    : {},
);

export { VideoEmbed };
