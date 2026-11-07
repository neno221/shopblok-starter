// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D101, D102). The quick
// view's two later members and the listing card's trigger in Testing Library and happy-dom: each
// member's trigger and popup carry its `data-variant`, the popup is a modal dialog named by the buy
// box's heading and opened from the keyboard, Escape closes it with focus back on the trigger; with
// `trigger={false}` a member draws no trigger and opens from `open`, giving focus back to the page's
// button (`finalFocus`); the compact member draws one picture and no notes. The listing card's
// trigger is a GET form to the product's page (the way there without scripts) named as the dialog's
// trigger, and ListingCard draws it for the `quick-add` card when the listing passes a quick view.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingCard } from "./listing-card";
import { QuickViewDialog, type QuickViewDialogProps } from "./quick-view-dialog";
import { QuickViewTrigger } from "./quick-view/trigger";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

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

const catalog = catalogs.en;
const copy: QuickViewDialogProps["copy"] = {
  buyBox: catalog.organisms.buyBox,
  variantSelector: catalog.molecules.variantSelector,
  priceBlock: catalog.molecules.priceBlock,
  quantityStepper: catalog.atoms.quantityStepper,
  stock: catalog.atoms.stock,
  rating: catalog.atoms.rating,
  quickViewDialog: catalog.organisms.quickViewDialog,
  productGallery: catalog.organisms.productGallery,
};
const box = commerceFixtures.en.productPage.buyBox.ready;
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe("the quick view's later members (T83)", () => {
  it.each(["drawer", "compact"] as const)(
    "%s opens from its trigger by keyboard, named by the box's heading, and Escape gives focus back",
    async (variant) => {
      const user = userEvent.setup();
      render(
        <QuickViewDialog {...box} variant={variant} copy={copy} locale="en-US" prefetch={false} />,
      );
      const trigger = slot("quick-view-trigger") as HTMLButtonElement;
      expect(trigger.getAttribute("data-variant")).toBe(variant);
      expect(trigger.getAttribute("aria-label")).toBe(`Quick view: ${box.product.title}`);
      trigger.focus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog");
      expect(dialog.getAttribute("data-variant")).toBe(variant);
      const heading = screen.getByRole("heading", {
        level: 2,
        name: box.product.title,
      });
      expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    },
  );

  it("the drawer is a sheet at the end edge", async () => {
    render(<QuickViewDialog {...box} variant="drawer" copy={copy} locale="en-US" defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("data-side")).toBe("inline-end");
  });

  it("the compact one draws one picture and no notes", async () => {
    render(<QuickViewDialog {...box} variant="compact" copy={copy} locale="en-US" defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelectorAll('[data-slot="quick-view-picture"] img')).toHaveLength(1);
    expect(slot("product-gallery")).toBeNull();
    for (const note of box.notes) expect(dialog.textContent).not.toContain(note);
  });

  it.each(["default", "drawer", "compact"] as const)(
    "%s with trigger={false} opens from `open` and gives focus back to the page's button",
    async (variant) => {
      const user = userEvent.setup();
      const button = document.createElement("button");
      document.body.append(button);
      button.focus();
      const back = createRef<HTMLElement>() as { current: HTMLElement | null };
      back.current = button;
      const onOpenChange = vi.fn();
      function Page() {
        const [open, setOpen] = useState(true);
        return (
          <QuickViewDialog
            {...box}
            variant={variant}
            copy={copy}
            locale="en-US"
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
            trigger={false}
            finalFocus={back}
          />
        );
      }
      render(<Page />);
      expect(slot("quick-view-trigger")).toBeNull();
      await screen.findByRole("dialog");
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      await waitFor(() => expect(document.activeElement).toBe(button));
      button.remove();
    },
  );
});

describe("the listing card's trigger (T83)", () => {
  const card = commerceFixtures.en.listing.grid.products.products[0]!;

  it("is a GET form to the product's page whose button is named as the dialog's trigger", () => {
    const markup = renderToStaticMarkup(
      <QuickViewTrigger
        product={card}
        variant="compact"
        copy={catalog.organisms.quickViewDialog}
        locale="en-US"
      />,
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    const form = host.querySelector("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe(card.href);
    expect(form.getAttribute("method")).toBe("get");
    expect(form.dataset["quickView"]).toBe(card.handle);
    // No field: without scripts the button opens the product's page as it is.
    expect(form.querySelectorAll("input")).toHaveLength(0);
    const button = form.querySelector('[data-slot="quick-view-trigger"]') as HTMLButtonElement;
    expect(button.type).toBe("submit");
    expect(button.dataset["variant"]).toBe("compact");
    expect(button.getAttribute("aria-label")).toBe(`Quick view: ${card.title}`);
    expect(button.textContent).toBe("Quick view");
  });

  it("replaces the quick-add card's form when the listing passes a quick view, and only then", () => {
    const cardCopy = {
      card: catalog.molecules.productCard,
      priceBlock: catalog.molecules.priceBlock,
    };
    const draw = (props: object) => {
      const host = document.createElement("div");
      host.innerHTML = renderToStaticMarkup(
        <ListingCard
          variant="quick-add"
          product={card}
          copy={cardCopy}
          locale="en-US"
          sizes="20vw"
          {...props}
        />,
      );
      return host;
    };
    const on = draw({
      quickView: { variant: "drawer", copy: catalog.organisms.quickViewDialog },
    });
    expect(on.querySelector('[data-slot="quick-view-trigger"]')?.getAttribute("data-variant")).toBe(
      "drawer",
    );
    expect(on.querySelector('[data-slot="product-card-quick-add"]')).toBeNull();
    const off = draw({});
    expect(off.querySelector('[data-slot="quick-view-trigger"]')).toBeNull();
    expect(
      off.querySelector('[data-slot="product-card-quick-add"]')?.getAttribute("data-intent"),
    ).toBe("choose");
    // Another card never draws it.
    const standard = document.createElement("div");
    standard.innerHTML = renderToStaticMarkup(
      <ListingCard
        variant="standard"
        product={card}
        copy={cardCopy}
        locale="en-US"
        sizes="20vw"
        quickView={{
          variant: "drawer",
          copy: catalog.organisms.quickViewDialog,
        }}
      />,
    );
    expect(standard.querySelector('[data-slot="quick-view-trigger"]')).toBeNull();
  });
});
