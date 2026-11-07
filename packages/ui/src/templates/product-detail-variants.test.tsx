// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D101). The product page's
// five later members in Testing Library and happy-dom: each draws its own `data-variant` on the
// family's root, the page's one `<main>` and `<h1>`, the page's islands in their places when given
// (`slots.gallery`, `slots.buyBox`), and, for the members that show every picture from `md`, one
// list of plain pictures beside the gallery (each hidden at the other widths, so a reader meets one
// set). `galleryLayoutFor` gives the page its gallery's layout, the first member's for a value the
// family lacks.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { VARIANTS } from "@shopblok/registry/contracts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GALLERY_LAYOUT,
  ProductDetailTemplate,
  galleryLayoutFor,
  productDetailCopy,
} from "./product-detail";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  for (const name of ["IntersectionObserver", "ResizeObserver"])
    vi.stubGlobal(
      name,
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
});

const page = pageFixtures.en.productDetail;
const members = VARIANTS["product-detail"];

function renderMember(variant: (typeof members)[number], slots?: object) {
  return render(
    <ProductDetailTemplate
      {...page}
      variant={variant}
      copy={productDetailCopy(catalogs.en)}
      locale="en-US"
      reviewsHrefFor={(n) => (n === 1 ? "/us/products/hoodie" : `/us/products/hoodie?page=${n}`)}
      prefetch={false}
      {...(slots === undefined ? {} : { slots })}
    />,
  );
}

describe("the product page's members (T83)", () => {
  it.each(members)("%s draws its own data-variant, one main and one h1", (variant) => {
    renderMember(variant);
    const root = slot("product-detail-template");
    expect(root?.tagName).toBe("MAIN");
    expect(root?.getAttribute("data-variant")).toBe(variant);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it.each(members)(
    "%s puts the page's islands where it lays out the gallery and the box",
    (variant) => {
      renderMember(variant, {
        gallery: <div data-slot="test-gallery" />,
        buyBox: <div data-slot="test-buy-box" />,
      });
      expect(slot("product-detail-gallery")?.contains(slot("test-gallery"))).toBe(true);
      expect(slot("product-detail-buy-box")?.contains(slot("test-buy-box"))).toBe(true);
      // The islands replace the values' gallery and buy box: neither is drawn twice.
      expect(slot("buy-box")).toBeNull();
      expect(slot("product-gallery")).toBeNull();
    },
  );

  it.each(["grid", "stacked", "wide"] as const)(
    "%s shows every picture from md and the gallery below it, one at a time",
    (variant) => {
      renderMember(variant);
      const list = slot("product-detail-pictures");
      expect(list?.querySelectorAll("img")).toHaveLength(page.gallery.media.length);
      expect(tokens(list)).toEqual(expect.arrayContaining(["hidden", "md:grid"]));
      expect(tokens(slot("product-gallery")?.parentElement ?? null)).toContain("md:hidden");
      // Each preloads its starting picture, at full size only where it is drawn (PR 120 review,
      // item 1): the gallery's below `md`, the list's first from `md`; elsewhere the smallest file.
      expect(GALLERY_LAYOUT[variant].priority).toBe(true);
      expect(GALLERY_LAYOUT[variant].sizes).toBe("(min-width: 768px) 1px, 100vw");
    },
  );

  it.each(["default", "thumbnails-below", "centered"] as const)(
    "%s draws the gallery alone, its first picture the page's to preload",
    (variant) => {
      renderMember(variant);
      expect(slot("product-detail-pictures")).toBeNull();
      expect(GALLERY_LAYOUT[variant].priority).toBe(true);
    },
  );

  it("puts the thumbnails under the picture in thumbnails-below, beside it in default", () => {
    expect(GALLERY_LAYOUT.default.thumbnails).toBe("side");
    expect(GALLERY_LAYOUT["thumbnails-below"].thumbnails).toBe("below");
  });

  it("puts the buy box before the information in wide, beside it", () => {
    renderMember("wide");
    const box = slot("product-detail-buy-box");
    const info = slot("product-info-accordions");
    expect(box?.compareDocumentPosition(info as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(box?.parentElement).toBe(info?.parentElement?.parentElement);
  });

  it("gives the page each member's gallery layout, the first member's for an unknown value", () => {
    for (const variant of members) expect(galleryLayoutFor(variant)).toBe(GALLERY_LAYOUT[variant]);
    expect(galleryLayoutFor("later")).toBe(GALLERY_LAYOUT.default);
    expect(galleryLayoutFor("toString")).toBe(GALLERY_LAYOUT.default);
  });
});
