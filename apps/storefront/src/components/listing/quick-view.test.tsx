// @vitest-environment happy-dom
// The listing's quick view (D101, D102, T83): the opener catches the submit of a card's quick view
// form, loads the island only then and opens it on that product and member; a module that does not
// load sends the visitor where the form goes without scripts. The island asks `/next/quick-view`
// for the market's product (the button busy meanwhile), opens the member with no trigger of its own,
// adds through the cart's action (the header's count follows) and sends the visitor to the product's
// page when the product cannot be read.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const added = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock("../../lib/actions/cart", () => ({
  addToCart: vi.fn(async (input: unknown) => {
    added.calls.push(input);
    return { ok: true, data: { count: 2, line: { id: "line_1" } } };
  }),
}));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, prefetch: _p, ...props }: Record<string, unknown>) =>
      createElement("a", { href, ...props }),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalog = catalogs.en;
const box = commerceFixtures.en.productPage.buyBox.ready;
const answer = {
  box,
  copy: {
    buyBox: catalog.organisms.buyBox,
    variantSelector: catalog.molecules.variantSelector,
    priceBlock: catalog.molecules.priceBlock,
    quantityStepper: catalog.atoms.quantityStepper,
    stock: catalog.atoms.stock,
    rating: catalog.atoms.rating,
    quickViewDialog: catalog.organisms.quickViewDialog,
    productGallery: catalog.organisms.productGallery,
  },
  locale: "en-US",
};

let root: Root;
let container: HTMLElement;
const assign = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  added.calls.length = 0;
  assign.mockReset();
  vi.stubGlobal("location", {
    ...window.location,
    assign,
    href: window.location.href,
  });
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
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.doUnmock("./quick-view-island");
  vi.resetModules();
});

/** A card's quick view form as `QuickViewTrigger` draws it. */
function cardForm(variant = "drawer") {
  const form = document.createElement("form");
  form.action = `/us/products/${box.product.handle}`;
  form.method = "get";
  form.dataset["quickView"] = box.product.handle;
  const button = document.createElement("button");
  button.type = "submit";
  button.dataset["slot"] = "quick-view-trigger";
  button.dataset["variant"] = variant;
  form.append(button);
  document.body.append(form);
  return { form, button };
}

const submit = (form: HTMLFormElement, button: HTMLElement) => {
  const event = new SubmitEvent("submit", {
    bubbles: true,
    cancelable: true,
    submitter: button,
  });
  form.dispatchEvent(event);
  return event;
};

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

describe("the quick view's opener (T83)", () => {
  it("loads the island on the press and opens it on the product and member the button names", async () => {
    const seen: Record<string, unknown>[] = [];
    vi.doMock("./quick-view-island", () => ({
      QuickViewIsland: (props: Record<string, unknown>) => {
        seen.push(props);
        return null;
      },
    }));
    const { QuickViewOpener } = await import("./quick-view-opener");
    await act(async () => root.render(<QuickViewOpener market="en-us" />));
    const { form, button } = cardForm();
    const event = submit(form, button);
    expect(event.defaultPrevented).toBe(true);
    await flush();
    expect(seen.at(-1)).toMatchObject({
      market: "en-us",
      handle: box.product.handle,
      variant: "drawer",
      from: button,
      press: 1,
    });
    submit(form, button);
    await flush();
    expect(seen.at(-1)).toMatchObject({ press: 2 });
    form.remove();
  });

  it("leaves every other form alone", async () => {
    const { QuickViewOpener } = await import("./quick-view-opener");
    await act(async () => root.render(<QuickViewOpener market="en-us" />));
    const form = document.createElement("form");
    document.body.append(form);
    expect(submit(form, form).defaultPrevented).toBe(false);
    form.remove();
  });

  it("goes to the product's page when the island's code does not load", async () => {
    vi.doMock("./quick-view-island", () => {
      throw new Error("ChunkLoadError");
    });
    const { QuickViewOpener } = await import("./quick-view-opener");
    await act(async () => root.render(<QuickViewOpener market="en-us" />));
    const { form, button } = cardForm();
    submit(form, button);
    await flush();
    await flush();
    expect(assign).toHaveBeenCalledWith(form.action);
    form.remove();
  });
});

describe("the quick view's island (T83)", () => {
  it("asks for the market's product, keeps the button busy, opens the member and adds", async () => {
    let answerNow: (value: Response) => void = () => {};
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => (answerNow = resolve)));
    vi.stubGlobal("fetch", fetcher);
    const { QuickViewIsland } = await import("./quick-view-island");
    const { button } = cardForm("compact");
    await act(async () =>
      root.render(
        <QuickViewIsland
          market="en-us"
          handle={box.product.handle}
          href={box.product.href}
          variant="compact"
          from={button}
          press={1}
        />,
      ),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `/next/quick-view?market=en-us&handle=${box.product.handle}`,
      expect.anything(),
    );
    expect(button.getAttribute("aria-busy")).toBe("true");
    await act(async () => answerNow(Response.json(answer)));
    await flush();
    expect(button.hasAttribute("aria-busy")).toBe(false);
    const dialog = document.querySelector('[data-slot="quick-view"]');
    expect(dialog?.getAttribute("data-variant")).toBe("compact");
    expect(document.querySelector('[data-slot="quick-view-trigger"][data-variant="compact"]')).toBe(
      button,
    );
    const add = dialog?.querySelector<HTMLButtonElement>(
      '[data-slot="buy-box"] button[type="submit"]',
    );
    await act(async () => add?.click());
    await flush();
    expect(added.calls).toEqual([
      expect.objectContaining({ market: "en-us", variantId: expect.any(String) }),
    ]);
    const { getSnapshot } = await import("../../lib/visitor/store");
    expect(getSnapshot()).toMatchObject({ cartCount: 2 });
    button.closest("form")?.remove();
  });

  it("goes to the product's page when the product cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(null, { status: 404 })),
    );
    const { QuickViewIsland } = await import("./quick-view-island");
    await act(async () =>
      root.render(
        <QuickViewIsland
          market="en-us"
          handle="gone"
          href="/us/products/gone"
          variant={undefined}
          from={null}
          press={1}
        />,
      ),
    );
    await flush();
    expect(assign).toHaveBeenCalledWith("/us/products/gone");
    expect(document.querySelector('[data-slot="quick-view"]')).toBeNull();
  });
});
