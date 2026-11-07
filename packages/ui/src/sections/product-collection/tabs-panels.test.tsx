// Ours (T81, SETUP.md "Catalog block variants (T81)"; D102). The tabs product collection's island,
// Base UI's tabs in happy-dom: the tab list named by the heading, the first tab's products drawn
// with nothing fetched, a tab's products fetched once from its endpoint the first time it is
// chosen, the loading and failed states, and the arrow keys showing the next tab at once. In its
// own file: importing the module here would load it before `next/dynamic` asks for it, so the
// section's server markup in `catalog-variants.test.tsx` would hold the tabs.
import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sectionsCopy } from "../section-copy";
import { ProductCollectionTabsPanels } from "./tabs-panels";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const f = sectionFixtures.en;
const copy = sectionsCopy(catalogs.en);
const locale = "en-US";

describe("the tabs product collection's island (T81)", () => {
  const section = f.productCollection.tabs;
  const [first, second, third] = section.tabs ?? [];
  const tabs = [
    first!,
    // The shop's: a tab with an endpoint and no products.
    { label: second!.label, href: second!.href, endpoint: "/next/block-tab?tab=1" },
    third!,
  ];
  const sold = second!.products ?? [];
  const answer = (products: readonly ProductCard[]) =>
    new Response(JSON.stringify({ products }), { headers: { "Content-Type": "application/json" } });

  function draw(fetcher: typeof fetch) {
    return render(
      <>
        <h2 id="collection-heading">{section.heading}</h2>
        <ProductCollectionTabsPanels
          tabs={tabs}
          first={section.products}
          labelledBy="collection-heading"
          copy={{ products: copy.products, tabs: copy.tabs }}
          locale={locale}
          prefetch={false}
          fetcher={fetcher}
        />
      </>,
    );
  }

  it("names the tab list by the heading and shows the first tab's products, fetching nothing", () => {
    const fetcher = vi.fn<typeof fetch>();
    draw(fetcher);
    const list = screen.getByRole("tablist", { name: section.heading });
    expect(
      within(list)
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual(tabs.map((tab) => tab.label));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("article")).toHaveLength(section.products.length);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches a tab's products from its endpoint the first time it is chosen, and once", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => answer(sold));
    draw(fetcher);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: second!.label }));
    expect(fetcher).toHaveBeenCalledWith("/next/block-tab?tab=1", expect.anything());
    await waitFor(() =>
      expect(within(screen.getByRole("tabpanel")).getAllByRole("article")).toHaveLength(
        sold.length,
      ),
    );
    await user.click(screen.getByRole("tab", { name: first!.label }));
    await user.click(screen.getByRole("tab", { name: second!.label }));
    expect(fetcher).toHaveBeenCalledOnce();
    // A tab that came with its products (the design system's) fetches nothing.
    await user.click(screen.getByRole("tab", { name: third!.label }));
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("says it is loading, then that it could not, and tries again", async () => {
    let fail = true;
    let release: () => void = () => {};
    const fetcher = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(fail ? new Response(null, { status: 503 }) : answer(sold));
        }),
    );
    draw(fetcher);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: second!.label }));
    expect(within(screen.getByRole("tabpanel")).getByRole("status").textContent).toBe(
      copy.tabs.loading,
    );
    release();
    const alert = await within(screen.getByRole("tabpanel")).findByRole("alert");
    expect(alert.textContent).toContain(copy.tabs.failed.title);
    fail = false;
    await user.click(within(alert).getByRole("button", { name: copy.tabs.failed.retry }));
    release();
    await waitFor(() =>
      expect(within(screen.getByRole("tabpanel")).getAllByRole("article")).toHaveLength(
        sold.length,
      ),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("the arrow keys move to the next tab and show it (automatic activation)", async () => {
    draw(vi.fn<typeof fetch>(async () => answer(sold)));
    const user = userEvent.setup();
    const [one, two] = screen.getAllByRole("tab");
    one!.focus();
    await user.keyboard("{ArrowRight}");
    expect(two).toBe(document.activeElement);
    expect(two!.getAttribute("aria-selected")).toBe("true");
  });

  it("draws what a refreshed page gives at once: a new tab, new products, a tab taken away (PR 124 review, item 1)", async () => {
    // Draft Mode: every tab comes with its products, and live preview refreshes the page.
    const given = [first!, { label: second!.label, href: second!.href, products: sold }, third!];
    const panels = (each: typeof given, products = section.products) => (
      <>
        <h2 id="collection-heading">{section.heading}</h2>
        <ProductCollectionTabsPanels
          tabs={each}
          first={products}
          labelledBy="collection-heading"
          copy={{ products: copy.products, tabs: copy.tabs }}
          locale={locale}
          prefetch={false}
          fetcher={vi.fn<typeof fetch>()}
        />
      </>
    );
    const titles = () =>
      within(screen.getByRole("tabpanel"))
        .getAllByRole("article")
        .map((card) => within(card).getAllByRole("link")[0]?.textContent);
    const { rerender } = render(panels(given.slice(0, 2)));
    const user = userEvent.setup();
    // A tab added by the editor: its products, not "Loading…".
    rerender(panels(given));
    await user.click(screen.getByRole("tab", { name: third!.label }));
    expect(titles()).toEqual((third!.products ?? []).map((p) => p.title));
    // The tab shown taken away: the last one left is shown, not an empty section.
    rerender(panels(given.slice(0, 2)));
    expect(screen.getByRole("tab", { name: second!.label }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(titles()).toEqual(sold.map((p) => p.title));
    // The first tab's products edited: the new ones.
    await user.click(screen.getByRole("tab", { name: first!.label }));
    rerender(panels(given.slice(0, 2), sold));
    expect(titles()).toEqual(sold.map((p) => p.title));
  });

  it("says a tab with neither products nor an endpoint could not be loaded, never loading forever", async () => {
    const fetcher = vi.fn<typeof fetch>();
    render(
      <ProductCollectionTabsPanels
        tabs={[first!, { label: second!.label, href: second!.href }]}
        first={section.products}
        labelledBy="collection-heading"
        copy={{ products: copy.products, tabs: copy.tabs }}
        locale={locale}
        prefetch={false}
        fetcher={fetcher}
      />,
    );
    await userEvent.setup().click(screen.getByRole("tab", { name: second!.label }));
    expect(within(screen.getByRole("tabpanel")).getByRole("alert")).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
