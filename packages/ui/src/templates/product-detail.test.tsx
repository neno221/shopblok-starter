// Ours (T49, SETUP.md "Product page (T49)"). The product page's template in Testing Library and
// happy-dom: the page's one `<main>` and `<h1>`, the order of its parts, the ids its parts link each
// other by, and the slots that replace the default buy box and gallery.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_DETAIL_IDS, ProductDetailTemplate, productDetailCopy } from "./product-detail";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

beforeEach(() => {
  // The gallery's and the carousel's embla, and the sticky bar's observer, ask for these.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function renderPage(locale: (typeof LOCALES)[number] = "en", props = {}) {
  const page = pageFixtures[locale].productDetail;
  return render(
    <ProductDetailTemplate
      {...page}
      copy={productDetailCopy(catalogs[locale])}
      locale="en-US"
      reviewsHrefFor={(n) => (n === 1 ? "/us/products/hoodie" : `/us/products/hoodie?page=${n}`)}
      prefetch={false}
      {...props}
    />,
  );
}

describe("ProductDetailTemplate", () => {
  it.each(LOCALES)("is the page's main with the product's name as its one h1, in %s", (locale) => {
    renderPage(locale);
    const page = pageFixtures[locale].productDetail;
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(page.buyBox.product.title);
  });

  it("draws the breadcrumbs, the gallery, the buy box, the information, the reviews and the related products, in that order", () => {
    renderPage();
    const order = [
      "breadcrumb",
      "product-detail-gallery",
      "product-detail-buy-box",
      "product-info-accordions",
      "reviews-section",
      "product-carousel",
    ].map((name) => {
      const element = slot(name);
      expect(element, name).not.toBeNull();
      return element as HTMLElement;
    });
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1] as HTMLElement;
      const after = order[index] as HTMLElement;
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("links the buy box, the sticky bar and the reviews by the shared ids", () => {
    renderPage();
    expect(document.getElementById(PRODUCT_DETAIL_IDS.form)?.tagName).toBe("FORM");
    expect(document.getElementById(PRODUCT_DETAIL_IDS.options)).not.toBeNull();
    expect(document.getElementById(PRODUCT_DETAIL_IDS.button)?.getAttribute("type")).toBe("submit");
    expect(document.getElementById(PRODUCT_DETAIL_IDS.reviews)).not.toBeNull();
    const reviewsLink = within(slot("buy-box") as HTMLElement)
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === `#${PRODUCT_DETAIL_IDS.reviews}`);
    expect(reviewsLink).toBeDefined();
  });

  it("draws the page's slots instead of the default buy box and gallery, and the recently viewed row last", () => {
    renderPage("en", {
      slots: {
        buyBox: <div data-slot="island-buy-box" />,
        gallery: <div data-slot="island-gallery" />,
        recentlyViewed: <section data-slot="recently-viewed" />,
      },
    });
    expect(slot("buy-box")).toBeNull();
    expect(slot("product-gallery")).toBeNull();
    expect(slot("product-detail-buy-box")?.firstElementChild?.getAttribute("data-slot")).toBe(
      "island-buy-box",
    );
    expect(slot("product-detail-gallery")?.firstElementChild?.getAttribute("data-slot")).toBe(
      "island-gallery",
    );
    expect(screen.getByRole("main").lastElementChild?.getAttribute("data-slot")).toBe(
      "recently-viewed",
    );
  });

  it("leaves out the related products when there are none, and is a div where the page has its main", () => {
    const { related: _related, ...page } = pageFixtures.en.productDetail;
    render(
      <ProductDetailTemplate
        {...page}
        copy={productDetailCopy(catalogs.en)}
        locale="en-US"
        reviewsHrefFor={() => "/"}
        as="div"
        mainId="template-product-detail"
      />,
    );
    expect(slot("product-carousel")).toBeNull();
    expect(screen.queryByRole("main")).toBeNull();
    expect(slot("product-detail-template")?.id).toBe("template-product-detail");
  });
});
