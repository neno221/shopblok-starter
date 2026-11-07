// Ours (T87, SETUP.md "Catalog sections (T87)"; D102). An island whose code is fetched when it is
// first drawn in the browser, so a route that may draw it carries none of it in its first load:
// React's `lazy`, without `next/dynamic`'s loader runtime (about 1.4 KB gzipped on a route that had
// none, T77's probe), which the product page could not spend. Call it at a client module's top
// level (a `"use client"` loader), never in a server component, which would put the module back in
// the first load.
// - **Its own hydration boundary, an `Activity`:** while the browser fetches the module, React
//   hydrates the rest of the page and keeps the island's server HTML (with no boundary, the whole
//   page would wait for the module, PR 127 review, item 2).
// - **Not a `Suspense`:** React sends a `Suspense` boundary's content after the page, hidden until a
//   script moves it in, when its content waited past the page's start (a per-request page, where a
//   form's `useActionState` waits for its action's encoding the first time) and also when it is
//   large and comes after the page's first 12.8 KB (React's outlining, prerendered pages too), so
//   without scripts the island would show nothing. An `Activity` is a hydration boundary that the
//   server writes in place: what waits in it holds the page, as with no boundary.
// - **No hook in the island:** an update that reaches the island while the browser waits for its
//   module (its props or a context above it changing during hydration) gives up the server's HTML
//   and suspends the nearest `Suspense` above, so the island stays a plain function of its props.
//   Drawn after hydration (a navigation, which Next runs as a transition), it suspends that
//   transition, so the page it is on shows once the module is in.
// - `server`: the component itself, which the server draws in place of the module (no `lazy` to
//   wait for there). A loader passes it as `typeof window === "undefined" ? { server: require(…) }
//   : {}`; Next's builds replace `typeof window`, so the browser's build drops the branch and its
//   `require`.
// - `ssr: false`: the server and the browser's first render draw nothing, and the module is
//   fetched once the island has mounted, in a `Suspense` of its own with no fallback (an island
//   that only adds behaviour, such as a tab list that replaces the server's links).
import {
  Activity,
  createElement,
  lazy,
  Suspense,
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
  const Lazy = lazy(async () => ({ default: await load() })) as ComponentType<P>;
  function Island(props: P) {
    return createElement(Activity, {
      mode: "visible",
      children: createElement(server ?? Lazy, props),
    });
  }
  function ClientOnlyIsland(props: P) {
    return useMounted()
      ? createElement(Suspense, { fallback: null }, createElement(Lazy, props))
      : null;
  }
  return ssr ? Island : ClientOnlyIsland;
}

export { lazyIsland };
export type { LazyIslandOptions };
