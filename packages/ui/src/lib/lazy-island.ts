// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). An island whose code is fetched when it is
// first drawn in the browser, so a route that may draw it carries none of it in its first load:
// React's `lazy` in a `Suspense` with no fallback, the shape `next/dynamic` has, without its
// loader runtime (about 1.4 KB gzipped on a route that had none, T77's probe), which the product
// page could not spend. Call it at a client module's top level (a `"use client"` loader), never in
// a server component, which would put the module back in the first load.
// - The server renders the island as before (React waits for the module on the server), so the
//   HTML, and what works without scripts, is unchanged; the browser hydrates the server's HTML once
//   the module is in.
// - `ssr: false`: the server and the browser's first render draw nothing, and the module is
//   fetched once the island has mounted (an island that only adds behaviour, such as a tab list
//   that replaces the server's links).
import {
  createElement,
  lazy,
  Suspense,
  useSyncExternalStore,
  type ComponentType,
  type ReactElement,
} from "react";

type LazyIslandOptions = { ssr?: boolean };

const noSubscribe = () => () => {};

/** Whether this render is in the browser after hydration (`false` on the server and while hydrating). */
function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

// `any`, as React's own `lazy` takes: a component's props are checked where `Island` is drawn.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyIsland<P extends Record<string, any>>(
  load: () => Promise<ComponentType<P>>,
  { ssr = true }: LazyIslandOptions = {},
): (props: P) => ReactElement | null {
  const Lazy = lazy(async () => ({ default: await load() }));
  function Island(props: P) {
    const mounted = useMounted();
    if (!ssr && !mounted) return null;
    return createElement(
      Suspense,
      { fallback: null },
      createElement(Lazy as ComponentType<P>, props),
    );
  }
  return Island;
}

export { lazyIsland };
export type { LazyIslandOptions };
