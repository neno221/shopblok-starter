// @vitest-environment happy-dom
import { catalogs } from "@shopblok/i18n";
import type { SearchResult } from "@shopblok/registry/contracts";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberSearch, resetRecentSearches } from "../../lib/visitor/recent-searches";

// D66: what the island gives SearchOverlay's frame and asks `/next/search`. The frame is a stand-in
// that keeps its last props, because what it draws from them is the ui package's test. T113: the
// panel's module is a stand-in too, counted, so the test sees when the island fetches it.
const overlay = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
  panelLoads: 0,
}));
vi.mock("@shopblok/ui/organisms/search-overlay-frame", () => ({
  SearchOverlayFrame: (props: Record<string, unknown>) => {
    overlay.props = props;
    return null;
  },
}));
vi.mock("@shopblok/ui/organisms/search-overlay-panel", () => {
  overlay.panelLoads += 1;
  return {
    SearchOverlayPanel: function PanelStandIn() {
      return null;
    },
  };
});

import { SEARCH_DELAY, SearchOverlayIsland } from "./search-overlay-island";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const found: SearchResult = {
  query: "dre",
  total: 1,
  products: [],
  categories: [{ label: "Dresses", href: "/us/categories/dresses" }],
  suggestions: ["dress"],
};

let root: Root;
let container: HTMLElement;

async function mount(fetcher: typeof fetch) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <SearchOverlayIsland
        market="en-us"
        action="/us/search"
        copy={catalogs.en.organisms.searchOverlay}
        priceCopy={catalogs.en.molecules.priceBlock}
        locale="en-US"
        prefetch={false}
        fetcher={fetcher}
      />,
    ),
  );
}

const props = () => overlay.props ?? {};
const type = (query: string) =>
  act(async () => (props()["onQueryChange"] as (query: string) => void)(query));
const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  resetRecentSearches();
  overlay.props = undefined;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("SearchOverlayIsland's panel (T113)", () => {
  // First in the file: the island keeps the fetched panel for the page's life.
  it("draws the frame without the panel and fetches it, once, when the visitor reaches for it", async () => {
    await mount(vi.fn() as unknown as typeof fetch);
    expect(props()["panel"]).toBeUndefined();
    expect(overlay.panelLoads).toBe(0);
    await act(async () => (props()["onWantPanel"] as () => void)());
    expect((props()["panel"] as { name: string } | undefined)?.name).toBe("PanelStandIn");
    await act(async () => (props()["onWantPanel"] as () => void)());
    expect(overlay.panelLoads).toBe(1);
  });

  it("has the panel at once in a header drawn again", async () => {
    await mount(vi.fn() as unknown as typeof fetch);
    expect((props()["panel"] as { name: string } | undefined)?.name).toBe("PanelStandIn");
  });
});

describe("SearchOverlayIsland (D66)", () => {
  it("asks once the visitor stops typing, for the market, and draws the answer", async () => {
    const fetcher = vi.fn(async () => Response.json(found));
    await mount(fetcher as unknown as typeof fetch);
    expect(props()["search"]).toEqual({ action: "/us/search", query: "" });
    await type("d");
    await type("dr");
    await type("dre ");
    expect(props()["loading"]).toBe(true);
    await wait(SEARCH_DELAY - 1);
    expect(fetcher).not.toHaveBeenCalled();
    await wait(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/next/search?market=en-us&q=dre");
    expect(init.credentials).toBe("same-origin");
    expect(props()["result"]).toEqual({ ...found, query: "dre " });
    expect(props()["loading"]).toBe(false);
  });

  it("aborts the question on its way when the visitor types again", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          signals.push(init.signal!);
          init.signal!.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
          if (signals.length === 2) resolve(Response.json({ ...found, query: "dress" }));
        }),
    );
    await mount(fetcher as unknown as typeof fetch);
    await type("dre");
    await wait(SEARCH_DELAY);
    await type("dress");
    expect(signals[0]?.aborted).toBe(true);
    await wait(SEARCH_DELAY);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((props()["result"] as SearchResult).query).toBe("dress");
  });

  it.each([
    ["a 404 (no handler until T50)", async () => new Response("", { status: 404 })],
    ["an answer that is not a result", async () => Response.json({ hits: [] })],
    ["a refused request", async () => Promise.reject(new TypeError("offline"))],
  ])("says there are no results for %s", async (_, answer) => {
    await mount(vi.fn(answer) as unknown as typeof fetch);
    await type("hat");
    await wait(SEARCH_DELAY);
    expect(props()["result"]).toEqual({
      query: "hat",
      total: 0,
      products: [],
      categories: [],
      suggestions: [],
    });
    expect(props()["loading"]).toBe(false);
  });

  it("asks nothing and aborts its question once it is gone", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>(() => {
          signals.push(init.signal!);
        }),
    );
    await mount(fetcher as unknown as typeof fetch);
    await type("dre");
    await wait(SEARCH_DELAY);
    await type("dress");
    await act(async () => root.unmount());
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await wait(SEARCH_DELAY);
    expect(fetcher).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });

  it("clears the result for an empty field, without asking", async () => {
    const fetcher = vi.fn(async () => Response.json(found));
    await mount(fetcher as unknown as typeof fetch);
    await type("dre");
    await type("  ");
    await wait(SEARCH_DELAY);
    expect(fetcher).not.toHaveBeenCalled();
    expect(props()["result"]).toBeUndefined();
    expect(props()["loading"]).toBe(false);
  });

  it("shows the browser's recent searches, and offers to clear them only when there are some", async () => {
    await mount(vi.fn() as unknown as typeof fetch);
    expect(props()["recent"]).toEqual([]);
    expect(props()["onClearRecent"]).toBeUndefined();
    await act(async () => rememberSearch("boots"));
    expect(props()["recent"]).toEqual(["boots"]);
    await act(async () => (props()["onClearRecent"] as () => void)());
    expect(props()["recent"]).toEqual([]);
  });
});
