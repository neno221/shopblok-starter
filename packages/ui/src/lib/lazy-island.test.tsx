import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { lazyIsland } from "./lazy-island";

// T87: what the server and the browser draw of a lazily loaded island. A `Suspense` on the server
// would, in a page rendered per request, send its content after the page, hidden until a script
// moves it in (React marks a boundary `<!--$-->`); the island must have none there.

function Greeting({ name }: { name: string }) {
  return <p data-slot="greeting">Hello, {name}</p>;
}

/** A load that resolves when the test says so. */
function deferredLoad() {
  let resolve: () => void = () => {};
  const loaded = new Promise<void>((done) => (resolve = done));
  const load = vi.fn(async () => {
    await loaded;
    return Greeting;
  });
  return { load, resolve };
}

describe("lazyIsland (T87)", () => {
  it("draws the server's copy in place on the server: no Suspense boundary, no waiting", () => {
    const Island = lazyIsland(() => Promise.resolve(Greeting), { server: Greeting });
    const html = renderToString(<Island name="Ann" />);
    expect(html).toContain("Hello, <!-- -->Ann");
    expect(html).not.toContain("<!--$");
  });

  it("draws nothing on the server with ssr: false, even with a copy", () => {
    const Island = lazyIsland(() => Promise.resolve(Greeting), { ssr: false, server: Greeting });
    expect(renderToString(<Island name="Ann" />)).toBe("");
  });

  it("keeps the server's HTML while the browser fetches the module, then hydrates it", async () => {
    const { load, resolve } = deferredLoad();
    // The server's HTML, from the copy; the browser's island has none (its build drops it).
    const OnServer = lazyIsland(load, { server: Greeting });
    const Island = lazyIsland(load);
    const container = document.createElement("div");
    container.innerHTML = renderToString(<OnServer name="Ann" />);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Island name="Ann" />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(load).toHaveBeenCalled();
    expect(container.textContent).toBe("Hello, Ann");
    await act(async () => resolve());
    expect(container.textContent).toBe("Hello, Ann");
    expect(errors).toEqual([]);
    act(() => root?.unmount());
  });

  it("draws an island first drawn after hydration once its module is in", async () => {
    const { load, resolve } = deferredLoad();
    const Island = lazyIsland(load);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<Island name="Ann" />));
    expect(container.textContent).toBe("");
    await act(async () => resolve());
    expect(container.querySelector("[data-slot=greeting]")?.textContent).toBe("Hello, Ann");
    act(() => root.unmount());
  });
});
