// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). An island whose code is fetched when it is
// first drawn in the browser, so a route that may draw it carries none of it in its first load:
// React's `lazy`, without `next/dynamic`'s loader runtime (about 1.4 KB gzipped on a route that had
// none, T77's probe), which the product page could not spend. Call it at a client module's top
// level (a `"use client"` loader), never in a server component, which would put the module back in
// the first load.
// - **No `Suspense` on the server or while hydrating.** A `Suspense` there would send what waits
//   inside it (the module, or a prop the server streams later) after the page in a page rendered
//   per request, hidden until a script moves it in: a form's answer without scripts would show no
//   form. Without one the server sends the island in place, as before T87, and the browser keeps
//   the server's HTML while it fetches the module, then hydrates it. An island first drawn after
//   the page hydrated (a popup's copy button) is drawn in a `Suspense` with no fallback.
// - `server`: the component itself, which the server draws without waiting for the module. A
//   loader passes it as `typeof window === "undefined" ? { server: require(…) } : {}`: Next's
//   builds replace `typeof window`, so the browser's build drops the branch and its `require`.
// - `ssr: false`: the server and the browser's first render draw nothing, and the module is
//   fetched once the island has mounted (an island that only adds behaviour, such as a tab list
//   that replaces the server's links).
import {
  createElement,
  lazy,
  Suspense,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactElement,
} from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LazyIslandOptions<P extends Record<string, any> = Record<string, never>> = {
  ssr?: boolean;
  /** The component itself, on the server only (see above). */
  server?: ComponentType<P>;
};

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
  { ssr = true, server }: LazyIslandOptions<P> = {},
): (props: P) => ReactElement | null {
  const Lazy = lazy(async () => ({ default: await load() }));
  function Island(props: P) {
    const mounted = useMounted();
    // Whether the island's first render was in the browser after hydration: kept, so a later render
    // keeps the same tree (`false` on the server and while hydrating).
    const [drawnLate] = useState(mounted);
    if (!ssr) {
      return mounted
        ? createElement(
            Suspense,
            { fallback: null },
            createElement(Lazy as ComponentType<P>, props),
          )
        : null;
    }
    const island = createElement(server ?? (Lazy as ComponentType<P>), props);
    return drawnLate ? createElement(Suspense, { fallback: null }, island) : island;
  }
  return Island;
}

export { lazyIsland };
export type { LazyIslandOptions };
