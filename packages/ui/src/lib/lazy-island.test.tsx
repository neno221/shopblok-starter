import { act, useActionState, useEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToReadableStream, renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { lazyIsland } from "./lazy-island";

// T87: what the server and the browser draw of a lazily loaded island. The island is an `Activity`
// of its own, so the rest of the page hydrates while its module loads (PR 127 review, item 2), and
// the server writes it in place, never after the page, hidden until a script moves it in
// (`<template …>` and `<div hidden id="S:…">`), as React does with a `Suspense` boundary whose
// content waited or is large.

function Greeting({ name }: { name: string }) {
  return <p data-slot="greeting">Hello, {name}</p>;
}

/** A load that resolves when the test says so. */
function deferredLoad<P>(component: (props: P) => React.ReactNode) {
  let resolve: () => void = () => {};
  const loaded = new Promise<void>((done) => (resolve = done));
  const load = vi.fn(async () => {
    await loaded;
    return component;
  });
  return { load, resolve };
}

type ServerAction = ((...args: unknown[]) => void) & {
  $$FORM_ACTION: () => { name: string };
  bind: (self: unknown, ...args: unknown[]) => ServerAction;
};

/**
 * As React's server actions on the server behave: encoding one for a `<form>` throws a pending
 * promise the first time, then the result is kept on that action; a bound copy (`useActionState`
 * binds its own) has its own encoding.
 */
function serverAction(id: string): ServerAction {
  let encoding: Promise<void> | undefined;
  let encoded = false;
  // Not writable, not configurable: as React defines them.
  return Object.defineProperties(() => {}, {
    $$FORM_ACTION: {
      value() {
        encoding ??= new Promise<void>((done) =>
          setTimeout(() => {
            encoded = true;
            done();
          }, 20),
        );
        if (!encoded) throw encoding;
        return { name: `$ACTION_ID_${id}` };
      },
    },
    bind: { value: () => serverAction(`${id}-bound`) },
  }) as ServerAction;
}

async function streamed(node: React.ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node);
  return new Response(stream).text();
}

describe("lazyIsland (T87)", () => {
  it("draws the server's copy in its own boundary, complete in place", () => {
    const Island = lazyIsland(() => Promise.resolve(Greeting), { server: Greeting });
    const html = renderToString(<Island name="Ann" />);
    expect(html).toBe('<!--&--><p data-slot="greeting">Hello, <!-- -->Ann</p><!--/&-->');
  });

  it("draws nothing on the server with ssr: false, even with a copy", () => {
    const Island = lazyIsland(() => Promise.resolve(Greeting), { ssr: false, server: Greeting });
    expect(renderToString(<Island name="Ann" />)).toBe("");
  });

  it("writes a form whose action's encoding waits in place, and a large island after 13 KB", async () => {
    function Form({ submit }: { submit: ServerAction }) {
      const [, action] = useActionState(submit, null, "/here");
      return (
        <form data-slot="form-block" action={action}>
          <p>{"x".repeat(14_000)}</p>
        </form>
      );
    }
    const Island = lazyIsland(() => Promise.resolve(Form), { server: Form });
    const html = await streamed(
      <main>
        <p>{"y".repeat(14_000)}</p>
        <Island submit={serverAction("1")} />
      </main>,
    );
    expect(html).toContain(
      '<!--&--><form data-slot="form-block" action="/here">' +
        '<input type="hidden" name="$ACTION_ID_1-bound"/><p>x',
    );
    expect(html).not.toContain("<template");
    expect(html).not.toContain("<div hidden");
  });

  it("hydrates the rest of the page while the island's module loads", async () => {
    const { load, resolve } = deferredLoad(Greeting);
    const OnServer = lazyIsland(load, { server: Greeting });
    const Island = lazyIsland(load);
    let effects = 0;
    let clicks = 0;
    function Buy() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        effects += 1;
      }, []);
      return (
        <button
          type="button"
          onClick={() => {
            clicks += 1;
            setCount(count + 1);
          }}
        >
          Add {count}
        </button>
      );
    }
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <main>
        <Buy />
        <OnServer name="Ann" />
      </main>,
    );
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <main>
          <Buy />
          <Island name="Ann" />
        </main>,
        { onRecoverableError: (error) => errors.push(error) },
      );
    });
    // The module is still on its way: the button works, and the island keeps the server's HTML.
    expect(load).toHaveBeenCalled();
    expect(effects).toBe(1);
    await act(async () => container.querySelector("button")?.click());
    expect(clicks).toBe(1);
    expect(container.querySelector("button")?.textContent).toBe("Add 1");
    expect(container.querySelector("[data-slot=greeting]")?.textContent).toBe("Hello, Ann");
    await act(async () => resolve());
    expect(container.querySelector("[data-slot=greeting]")?.textContent).toBe("Hello, Ann");
    expect(errors).toEqual([]);
    act(() => root?.unmount());
  });

  it("draws an island first drawn after hydration once its module is in", async () => {
    const { load, resolve } = deferredLoad(Greeting);
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
