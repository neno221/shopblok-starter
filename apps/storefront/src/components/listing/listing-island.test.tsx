// @vitest-environment happy-dom
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage } from "@shopblok/i18n";
import { listingResultsCopy } from "@shopblok/ui/templates/listing-results";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// D59 (T50): what the listing island asks `/next/listing`, draws, announces and catches. Next's
// router is a stand-in whose search parameters are the window's, as the app's are; the results are
// the ui package's (the fixtures' listing).
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => router,
}));

import { ListingIsland } from "./listing-island";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const results = pageFixtures.en.productListing.results;
const copy = listingResultsCopy(catalogs.en);
const announce = catalogs.en.templates.productListing;
const BASE = "/us/categories/hoodies";
const ACTION = "/us/search";
const SCOPE = "category:hoodies";

let root: Root;
let container: HTMLElement;

async function mount(fetcher: typeof fetch, url = BASE) {
  window.history.replaceState(null, "", url);
  await act(async () =>
    root.render(
      <ListingIsland
        market="en-us"
        scope={SCOPE}
        base={BASE}
        pathPage={1}
        action={ACTION}
        copy={copy}
        announce={announce}
        locale="en-US"
        prefetch={false}
        fetcher={fetcher}
      />,
    ),
  );
}

const answering = (body: unknown, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch &
    ReturnType<typeof vi.fn>;

const island = () => container.querySelector<HTMLElement>('[data-slot="listing-island"]');
const status = () => container.querySelector('[role="status"]');
const robots = () => document.head.querySelector('meta[name="robots"]');

beforeEach(() => {
  router.push.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  for (const form of document.querySelectorAll("form[data-test]")) form.remove();
});

describe("ListingIsland: the query", () => {
  it("asks nothing and draws nothing for a clean URL", async () => {
    const fetcher = answering(results);
    await mount(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(island()?.hasAttribute("data-active")).toBe(false);
    expect(island()?.hasAttribute("aria-busy")).toBe(false);
    expect(status()?.textContent).toBe("");
    expect(container.querySelector('[data-slot="listing-results"]')).toBeNull();
    expect(robots()).toBeNull();
  });

  it("asks nothing for a query and a scope alone", async () => {
    const fetcher = answering(results);
    await mount(fetcher, `${BASE}?q=hoodie&scope=${SCOPE}&utm=1`);
    expect(fetcher).not.toHaveBeenCalled();
    expect(island()?.hasAttribute("data-active")).toBe(false);
  });

  it("asks for the market's, the scope's and the page's results with the sort, and draws them", async () => {
    const fetcher = answering(results);
    await mount(fetcher, `${BASE}?sort=price-asc&q=ignored`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const asked = new URL(url, "http://localhost");
    expect(asked.pathname).toBe("/next/listing");
    expect([...asked.searchParams.entries()]).toEqual([
      ["market", "en-us"],
      ["scope", SCOPE],
      ["page", "1"],
      ["sort", "price-asc"],
    ]);
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(island()?.hasAttribute("aria-busy")).toBe(false);
    expect(island()?.className).toContain("peer");
    expect(container.querySelector('[data-slot="listing-results"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="product-card"]').length).toBe(
      results.grid.products.length,
    );
    expect(status()?.textContent).toBe(
      formatMessage(announce.found, { count: results.toolbar.count }, "en-US"),
    );
    expect(status()?.textContent).toContain(String(results.toolbar.count));
  });

  it("asks with the filters in one order, and the page from the query before the path's", async () => {
    const fetcher = answering(results);
    await mount(fetcher, `${BASE}?sale=1&category=pcat_b&category=pcat_a&page=3`);
    const [url] = fetcher.mock.calls[0] as unknown as [string];
    expect(new URL(url, "http://localhost").search).toBe(
      "?market=en-us&scope=category%3Ahoodies&page=3&category=pcat_a&category=pcat_b&sale=1",
    );
  });

  it("says it is loading until the answer comes, with the server's results hidden", async () => {
    let answer: (response: Response) => void = () => {};
    const fetcher = vi.fn(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    ) as unknown as typeof fetch;
    await mount(fetcher, `${BASE}?sort=newest`);
    expect(island()?.getAttribute("aria-busy")).toBe("true");
    expect(status()?.textContent).toBe(announce.loading);
    // A URL that changes the results never shows the server's (PR 78 review, item 1).
    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(container.querySelector('[data-slot="listing-island-loading"]')).not.toBeNull();
    await act(async () => answer(Response.json(results)));
    expect(island()?.hasAttribute("aria-busy")).toBe(false);
    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(container.querySelector('[data-slot="listing-island-loading"]')).toBeNull();
  });

  it("says the results could not be loaded when Medusa is down, and asks again on Try again", async () => {
    const fetcher = answering(null, 503);
    await mount(fetcher, `${BASE}?sale=1`);
    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(island()?.hasAttribute("aria-busy")).toBe(false);
    expect(status()?.textContent).toBe(announce.failed.title);
    const failed = container.querySelector('[data-slot="listing-island-failed"]');
    expect(failed?.textContent).toContain(announce.failed.text);
    expect(container.querySelector('[data-slot="listing-results"]')).toBeNull();
    fetcher.mockImplementation(async () => Response.json(results));
    const retry = [...(failed?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === announce.failed.retry,
    );
    await act(async () => retry?.click());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-slot="listing-results"]')).not.toBeNull();
  });

  it("says the same when the answer is no listing, or the request fails", async () => {
    await mount(answering({ nothing: true }), `${BASE}?sort=newest`);
    expect(container.querySelector('[data-slot="listing-island-failed"]')).not.toBeNull();
    await act(async () => root.render(null));
    const failing = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await mount(failing, `${BASE}?sort=price-desc`);
    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(container.querySelector('[data-slot="listing-island-failed"]')).not.toBeNull();
  });

  it("gives no match with the way back to the listing for a page that is not there", async () => {
    await mount(answering(null, 404), `${BASE}?sale=1&page=3`);
    expect(island()?.hasAttribute("data-active")).toBe(true);
    expect(status()?.textContent).toBe(announce.noMatch.title);
    const missing = container.querySelector('[data-slot="listing-island-missing"]');
    expect(missing?.textContent).toContain(announce.noMatch.text);
    expect(missing?.querySelector("a")?.getAttribute("href")).toBe(BASE);
  });

  it("links the pages by the listing's own address with the filters", async () => {
    await mount(
      answering({ ...results, page: { page: 1, pageCount: 3 } }),
      `${BASE}?sale=1&sort=newest`,
    );
    const hrefs = [...container.querySelectorAll<HTMLAnchorElement>('[data-slot="pagination"] a')]
      .map((link) => link.getAttribute("href"))
      .filter((href) => href !== null);
    expect(hrefs).toContain(`${BASE}?sale=1&sort=newest&page=2`);
    expect(hrefs.some((href) => href.includes("page=1"))).toBe(false);
  });
});

describe("ListingIsland: noindex (SPEC §12)", () => {
  it("adds robots noindex,follow with more than two facets", async () => {
    await mount(answering(results), `${BASE}?category=pcat_a&category=pcat_b&sale=1`);
    expect(robots()?.getAttribute("content")).toBe("noindex,follow");
  });

  it("adds nothing with two facets or fewer", async () => {
    await mount(answering(results), `${BASE}?category=pcat_a&sale=1&sort=newest`);
    expect(robots()).toBeNull();
  });
});

describe("ListingIsland: the forms", () => {
  /** A GET form as the filter sidebar draws it: the fields, and a hidden scope. */
  function form(fields: [string, string][], options: { action?: string; method?: string } = {}) {
    const element = document.createElement("form");
    element.setAttribute("data-test", "");
    element.method = options.method ?? "get";
    element.action = options.action ?? ACTION;
    for (const [name, value] of fields) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      element.append(input);
    }
    document.body.append(element);
    return element;
  }
  const submit = (element: HTMLFormElement) => {
    const event = new SubmitEvent("submit", { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
  };

  it("turns a submit for this listing into its URL: the filters and sort, the page reset", async () => {
    await mount(answering(results));
    const pushState = vi.spyOn(window.history, "pushState");
    const event = submit(
      form([
        ["scope", SCOPE],
        ["sort", "newest"],
        ["page", "3"],
        ["q", ""],
        ["category", "pcat_b"],
        ["category", "pcat_a"],
        ["price.min", ""],
        ["sale", "1"],
      ]),
    );
    expect(event.defaultPrevented).toBe(true);
    const target = `${BASE}?category=pcat_a&category=pcat_b&sale=1&sort=newest`;
    expect(pushState).toHaveBeenCalledWith(null, "", target);
    expect(window.location.pathname + window.location.search).toBe(target);
    expect(router.push).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it("goes to the listing's address with no query when every field is empty", async () => {
    await mount(answering(results), `${BASE}?sale=1`);
    submit(
      form([
        ["scope", SCOPE],
        ["price.min", ""],
      ]),
    );
    expect(window.location.pathname + window.location.search).toBe(BASE);
  });

  it("changes the page through the router when the form is for another path", async () => {
    await mount(answering(results), `/us/search?q=x`);
    submit(
      form([
        ["scope", SCOPE],
        ["sale", "1"],
      ]),
    );
    expect(router.push).toHaveBeenCalledWith(`${BASE}?sale=1`, { scroll: false });
    expect(window.location.pathname).toBe("/us/search");
  });

  it("does not take a form that is for another listing", async () => {
    await mount(answering(results));
    const pushState = vi.spyOn(window.history, "pushState");
    const event = submit(
      form([
        ["scope", "category:other"],
        ["sale", "1"],
      ]),
    );
    expect(event.defaultPrevented).toBe(false);
    expect(submit(form([["sale", "1"]])).defaultPrevented).toBe(false);
    expect(pushState).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it("does not take a form for another address, or one that is not a GET", async () => {
    await mount(answering(results));
    expect(submit(form([["scope", SCOPE]], { action: "/us/elsewhere" })).defaultPrevented).toBe(
      false,
    );
    expect(submit(form([["scope", SCOPE]], { method: "post" })).defaultPrevented).toBe(false);
  });

  it("takes a form whose action is written as a whole URL", async () => {
    await mount(answering(results));
    const event = submit(
      form(
        [
          ["scope", SCOPE],
          ["sale", "1"],
        ],
        { action: `${window.location.origin}${ACTION}` },
      ),
    );
    expect(event.defaultPrevented).toBe(true);
  });

  it("stops listening when it is gone", async () => {
    await mount(answering(results));
    await act(async () => root.unmount());
    root = createRoot(container);
    expect(
      submit(
        form([
          ["scope", SCOPE],
          ["sale", "1"],
        ]),
      ).defaultPrevented,
    ).toBe(false);
  });
});
