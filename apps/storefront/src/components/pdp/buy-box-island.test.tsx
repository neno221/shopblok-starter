// @vitest-environment happy-dom
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { PRODUCT_DETAIL_IDS, productDetailCopy } from "@shopblok/ui/templates/product-detail";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next keeps `useSearchParams` in step with `history.replaceState`; the stand-in reads the address.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const added = vi.hoisted(() => ({
  calls: [] as unknown[],
  answer: { ok: true, data: { count: 3 } } as unknown,
}));
vi.mock("../../lib/actions/cart", () => ({
  addToCart: vi.fn(async (input: unknown) => {
    added.calls.push(input);
    return added.answer;
  }),
}));

import { getSnapshot, resetVisitor } from "../../lib/visitor/store";
import { BuyBoxIsland } from "./buy-box-island";
import { resetPublishedChoice, usePublishedChoice } from "./choice-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = pageFixtures.en.productDetail.buyBox.product;
const copy = productDetailCopy(catalogs.en);
const [colour, size] = product.options;
const target = product.variants.find(
  (variant) => variant.available,
) as (typeof product.variants)[number];

let root: Root;
let container: HTMLElement;
let published: unknown = null;

function Watcher() {
  const choice = usePublishedChoice(product.id);
  useEffect(() => {
    published = choice;
  }, [choice]);
  return null;
}

async function mount() {
  await act(async () => {
    root.render(
      <>
        <BuyBoxIsland
          product={product}
          notes={[]}
          maxQuantity={99}
          market="en-us"
          locale="en-US"
          copy={{ buyBox: copy.buyBox, sticky: copy.sticky }}
          ids={PRODUCT_DETAIL_IDS}
        />
        <Watcher />
      </>,
    );
  });
}

function radio(optionIndex: number, valueId: string): HTMLElement {
  const group = container.querySelectorAll('[data-slot="variant-selector-option"]')[optionIndex];
  const option = [colour, size][optionIndex];
  const label = option?.values.find((value) => value.id === valueId)?.label;
  const found = [...(group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])].find(
    (each) =>
      each.textContent?.trim() === label ||
      each.getAttribute("aria-label")?.startsWith(label ?? "?"),
  );
  if (found === undefined) throw new Error(`no radio for ${valueId}`);
  return found;
}

/** A press as a pointer makes it: Base UI's radios answer the pointer, not a bare `click()`. */
function press(element: HTMLElement) {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"])
    element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
  element.click();
}

beforeEach(() => {
  window.history.replaceState(null, "", "/us/products/hoodie");
  added.calls = [];
  resetVisitor();
  resetPublishedChoice();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("BuyBoxIsland (D61)", () => {
  it("opens on the variant the URL names", async () => {
    window.history.replaceState(null, "", `/us/products/hoodie?variant=${target.id}`);
    await mount();
    const checked = container.querySelectorAll(
      '[data-slot="buy-box"] [role="radio"][aria-checked="true"]',
    );
    expect(checked).toHaveLength(product.options.length);
    expect(published).toEqual(target.options);
  });

  it("writes a full choice into the URL, publishes a partial one, and keeps it", async () => {
    await mount();
    const colourId = target.options[colour?.id as string] as string;
    const sizeId = target.options[size?.id as string] as string;
    await act(async () => press(radio(0, colourId)));
    expect(window.location.search).toBe("");
    expect(published).toEqual({ [colour?.id as string]: colourId });
    await act(async () => press(radio(1, sizeId)));
    expect(new URL(window.location.href).searchParams.get("variant")).toBe(target.id);
    expect(published).toEqual(target.options);
  });

  it("follows a link back to the variant it opened on after another choice", async () => {
    const other = product.variants.find(
      (variant) =>
        variant.available &&
        variant.id !== target.id &&
        variant.options[colour?.id as string] === target.options[colour?.id as string],
    ) as (typeof product.variants)[number];
    window.history.replaceState(null, "", `/us/products/hoodie?variant=${target.id}`);
    await mount();
    await act(async () => press(radio(1, other.options[size?.id as string] as string)));
    expect(new URL(window.location.href).searchParams.get("variant")).toBe(other.id);
    // A link to `?variant=` of the first one: the stand-in reads the address on the next render.
    window.history.replaceState(null, "", `/us/products/hoodie?variant=${target.id}`);
    await mount();
    expect(published).toEqual(target.options);
    const button = container.querySelector<HTMLElement>('[data-slot="buy-box-add"]') as HTMLElement;
    await act(async () => button.click());
    expect(added.calls).toEqual([{ market: "en-us", variantId: target.id, quantity: "1" }]);
  });

  it("adds through the action and gives the store the new count", async () => {
    window.history.replaceState(null, "", `/us/products/hoodie?variant=${target.id}`);
    await mount();
    const button = container.querySelector<HTMLElement>('[data-slot="buy-box-add"]') as HTMLElement;
    await act(async () => button.click());
    expect(added.calls).toEqual([{ market: "en-us", variantId: target.id, quantity: "1" }]);
    expect(getSnapshot()).toMatchObject({ cartCount: 3 });
    expect(container.querySelector('[data-slot="buy-box"]')?.getAttribute("data-status")).toBe(
      "added",
    );
  });
});
