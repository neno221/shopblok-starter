// Ours (T38, SETUP.md "Product-page organisms (T38)"). QuickViewDialog's tests, in Testing Library
// and happy-dom: the trigger alone (its name, which says the product and contains its words), the
// dialog it opens (named by the buy box's heading, one name; where the focus goes; Tab and Shift+Tab
// kept inside; ONE Escape; the close button), what it holds (the gallery with no zoom and the
// thumbnails below, the buy box at level 2 with no size guide, the link to the full page with its
// prefetch), the choice it keeps and hands to both (the gallery's `selectedValueIds`, the callback,
// the prop it follows), adding from inside (the box's rules hold; it stays open after `added`), the
// states the design system draws (`defaultOpen`, `modal`, `popupClassName`), the 44 px controls, a long
// German and Greek label, the four catalogs and a read of the file's imports (D49). Pixels are not
// measurable here: the layout and the real sizes belong to the design-system job's browser checks,
// which the lead runs.
// - ProductGallery is the other half of T38. This file wraps it: it still renders the real one, and
//   it records the props the dialog gave it, so what the dialog asks of the gallery is tested here and
//   what the gallery draws is tested in its own file. Where a test needs the gallery in the page it
//   finds `[data-slot="product-gallery"]` and nothing inside it.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import type { VariantSelection } from "@shopblok/registry/contracts";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import type { ProductGallery as ProductGalleryComponent } from "./product-gallery";
import { QuickViewDialog, type QuickViewDialogProps } from "./quick-view-dialog";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

// The gallery is rendered for real, and the props it was given are kept for the tests to read.
const galleryCalls = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));
vi.mock("./product-gallery", async (importOriginal) => {
  const actual = await importOriginal<{ ProductGallery: typeof ProductGalleryComponent }>();
  const { createElement } = await import("react");
  return {
    ...actual,
    ProductGallery: (props: Record<string, unknown>) => {
      galleryCalls.props.push(props);
      return createElement(actual.ProductGallery, props as never);
    },
  };
});
const lastGallery = () => galleryCalls.props[galleryCalls.props.length - 1] ?? {};

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

type State = "empty" | "partial" | "ready" | "low" | "soldOut";
const fixture = (locale: Locale, state: State) =>
  commerceFixtures[locale].productPage.buyBox[state];

function copyOf(locale: Locale): QuickViewDialogProps["copy"] {
  const catalog = catalogs[locale];
  return {
    buyBox: catalog.organisms.buyBox,
    variantSelector: catalog.molecules.variantSelector,
    priceBlock: catalog.molecules.priceBlock,
    quantityStepper: catalog.atoms.quantityStepper,
    stock: catalog.atoms.stock,
    rating: catalog.atoms.rating,
    quickViewDialog: catalog.organisms.quickViewDialog,
    productGallery: catalog.organisms.productGallery,
  };
}

function element(locale: Locale, state: State, props: Partial<QuickViewDialogProps> = {}) {
  return (
    <QuickViewDialog
      {...fixture(locale, state)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const trigger = () => slot("quick-view-trigger") as HTMLButtonElement;
const popup = () => slot("quick-view");
const tokens = (node: Element | null) => (node?.getAttribute("class") ?? "").split(/\s+/);
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
const focused = () => document.activeElement as HTMLElement | null;
/** Intl and the catalogs may write a no-break space, a narrow one or a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();

async function openDialog(
  locale: Locale = "en",
  state: State = "ready",
  props: Partial<QuickViewDialogProps> = {},
) {
  const view = render(element(locale, state, props));
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(popup()).not.toBeNull());
  return { user, opener, view };
}

beforeEach(() => {
  galleryCalls.props.length = 0;
});

describe("QuickViewDialog: the trigger", () => {
  it.each(LOCALES)(
    "is the only thing drawn until it is pressed, and names the product, in %s",
    (locale) => {
      const box = fixture(locale, "ready");
      const copy = catalogs[locale].organisms.quickViewDialog;
      render(element(locale, "ready"));
      const name = formatMessage(copy.openLabel, { title: box.product.title }, htmlLang[locale]);
      expect(screen.getByRole("button", { name })).toBe(trigger());
      // WCAG 2.5.3: the words that can be seen are in the name, at its start.
      expect(trigger().textContent).toBe(copy.open);
      expect(name.startsWith(copy.open)).toBe(true);
      expect(name).toContain(box.product.title);
      expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
      expect(trigger().getAttribute("aria-expanded")).toBe("false");
      expect(popup()).toBeNull();
      expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
      expect(slot("product-gallery")).toBeNull();
      expect(slot("buy-box")).toBeNull();
    },
  );

  it("is 44 px tall, wraps its words, and takes the card's classes after its own", () => {
    render(element("en", "ready", { triggerClassName: "absolute end-2 top-2" }));
    expect(tokens(trigger())).toEqual(
      expect.arrayContaining([
        "min-h-11",
        "max-w-full",
        "wrap-anywhere",
        "absolute",
        "end-2",
        "top-2",
      ]),
    );
    expect(tokens(trigger())).toContain("focus-visible:ring-ring");
  });

  it("renders on the server as the button alone", () => {
    const html = renderToString(element("en", "ready"));
    expect(html).toContain('data-slot="quick-view-trigger"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("product-gallery");
    expect(html).not.toContain("buy-box");
  });

  it.each([["click"], ["{Enter}"], [" "]])("opens the dialog on %j", async (how) => {
    render(element("en", "ready"));
    const user = userEvent.setup();
    if (how === "click") await user.click(trigger());
    else {
      trigger().focus();
      await user.keyboard(how);
    }
    await waitFor(() => expect(popup()).not.toBeNull());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("QuickViewDialog: the dialog", () => {
  it.each(LOCALES)("is a modal dialog named by the buy box's heading, in %s", async (locale) => {
    const box = fixture(locale, "ready");
    await openDialog(locale, "ready");
    const dialog = screen.getByRole("dialog", { name: box.product.title });
    expect(dialog).toBe(popup());
    // One name, not two: the dialog is labelled by the heading that the buy box draws.
    const heading = within(dialog).getByRole("heading", { level: 2, name: box.product.title });
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(within(dialog).queryAllByRole("heading", { name: box.product.title })).toHaveLength(1);
    expect(within(dialog).queryByRole("heading", { level: 1 })).toBeNull();
    expect(dialog.hasAttribute("aria-label")).toBe(false);
  });

  it.each(LOCALES)("has a close button named by the catalog, in %s", async (locale) => {
    await openDialog(locale, "ready");
    const close = within(popup() as HTMLElement).getByRole("button", {
      name: catalogs[locale].organisms.quickViewDialog.close,
    });
    expect(close.getAttribute("data-slot")).toBe("dialog-close");
    expect(tokens(close)).toContain("size-11");
  });

  it("moves the focus inside when it opens", async () => {
    await openDialog("en", "ready");
    await waitFor(() => expect(popup()?.contains(focused())).toBe(true));
  });

  it("closes with the close button and puts the focus back on the trigger", async () => {
    const { user, opener } = await openDialog("en", "ready");
    await user.click(within(popup() as HTMLElement).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(popup()).toBeNull());
    expect(focused()).toBe(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes with ONE Escape, and puts the focus back on the trigger", async () => {
    const { user, opener } = await openDialog("en", "ready");
    await waitFor(() => expect(popup()?.contains(focused())).toBe(true));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    expect(focused()).toBe(opener);
  });

  // Over the 5 s default once on the PC in W4 (5028 ms), like CookieConsent's Tab loop on the
  // Windows runner (PR 66 CI, windows-smoke).
  it("keeps Tab and Shift+Tab inside, all the way round", async () => {
    const { user } = await openDialog("en", "ready");
    await waitFor(() => expect(popup()?.contains(focused())).toBe(true));
    const controls = popup()?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), [tabindex="0"]',
    );
    const steps = (controls?.length ?? 0) + 4;
    for (let step = 0; step < steps; step += 1) {
      await user.tab();
      expect(
        popup()?.contains(focused()) || focused()?.hasAttribute("data-base-ui-focus-guard"),
      ).toBe(true);
      expect(focused()).not.toBe(trigger());
    }
    for (let step = 0; step < steps; step += 1) {
      await user.tab({ shift: true });
      expect(
        popup()?.contains(focused()) || focused()?.hasAttribute("data-base-ui-focus-guard"),
      ).toBe(true);
      expect(focused()).not.toBe(trigger());
    }
  }, 30_000);

  it("makes the page behind it unreachable while it is open", async () => {
    render(
      <>
        <button type="button">Behind</button>
        {element("en", "ready")}
      </>,
    );
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Behind" })).toBeTruthy();
    await user.click(trigger());
    await waitFor(() => expect(popup()).not.toBeNull());
    expect(screen.queryByRole("button", { name: "Behind" })).toBeNull();
  });
});

describe("QuickViewDialog: what it holds", () => {
  it("holds the gallery, the buy box at level 2, and the link to the full page, and no size guide", async () => {
    const box = fixture("en", "ready");
    await openDialog("en", "ready");
    const dialog = popup() as HTMLElement;
    expect(dialog.querySelectorAll('[data-slot="product-gallery"]')).toHaveLength(1);
    const form = slot("buy-box", dialog) as HTMLFormElement;
    expect(form.tagName).toBe("FORM");
    expect(dialog.querySelectorAll("form")).toHaveLength(1);
    expect(slot("buy-box-title", dialog)?.tagName).toBe("H2");
    // The gallery comes before the box in the page (the picture above the choices on a phone).
    const gallery = slot("product-gallery", dialog) as HTMLElement;
    expect(gallery.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No size guide: a dialog does not open another.
    expect(screen.queryByRole("button", { name: "Size guide" })).toBeNull();
    expect(slot("variant-selector-label-row", dialog)).toBeNull();
    expect(slot("buy-box-size-guide", dialog)).toBeNull();
    // The reviews count is words: there is no #reviews on a listing page to go to.
    expect(slot("buy-box-reviews", dialog)?.tagName).toBe("SPAN");
    const details = within(dialog).getByRole("link", { name: "View full details" });
    expect(details).toBe(slot("quick-view-details"));
    expect(details.getAttribute("href")).toBe(box.product.href);
    expect(details.getAttribute("data-prefetch")).toBe("false");
  });

  it.each(LOCALES)("says 'view full details' in the catalog's words, in %s", async (locale) => {
    await openDialog(locale, "ready");
    expect(
      within(popup() as HTMLElement).getByRole("link", {
        name: catalogs[locale].organisms.quickViewDialog.details,
      }),
    ).toBe(slot("quick-view-details"));
  });

  it("sends 'view full details' to the address of the shopper's choice when given one", async () => {
    const asked: VariantSelection[] = [];
    const { user } = await openDialog("en", "ready", {
      detailsHref: (selection) => {
        asked.push(selection);
        return `/us/products/x?${new URLSearchParams(selection).toString()}`;
      },
    });
    await user.click(screen.getByRole("radio", { name: "L" }));
    const href = slot("quick-view-details")?.getAttribute("href") ?? "";
    expect(href).toBe(`/us/products/x?${new URLSearchParams(asked.at(-1)).toString()}`);
    expect(Object.values(asked.at(-1) ?? {})).toHaveLength(2);
  });

  it.each([[true], [false], [null], [undefined]])(
    "gives the link the prefetch it was given: %s",
    async (prefetch) => {
      await openDialog("en", "ready", { prefetch });
      expect(slot("quick-view-details")?.getAttribute("data-prefetch")).toBe(String(prefetch));
    },
  );

  it("asks the gallery for no zoom, thumbnails below, and the product's own pictures", async () => {
    const box = fixture("en", "ready");
    await openDialog("en", "ready");
    expect(lastGallery()).toMatchObject({
      title: box.product.title,
      media: box.product.media,
      zoom: false,
      thumbnails: "below",
      locale: "en-US",
      copy: catalogs.en.organisms.productGallery,
    });
    expect(typeof lastGallery().sizes).toBe("string");
  });

  it("draws no zoom button in the dialog", async () => {
    await openDialog("en", "ready");
    expect(slot("product-gallery-zoom-trigger")).toBeNull();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it("is a column of a strip and a scrolling body, so the close button stays in the corner", async () => {
    await openDialog("en", "ready");
    const dialog = popup() as HTMLElement;
    expect(tokens(dialog)).toEqual(
      expect.arrayContaining(["flex", "flex-col", "overflow-hidden", "p-0", "gap-0"]),
    );
    expect(tokens(dialog)).not.toContain("overflow-y-auto");
    expect(tokens(dialog)).not.toContain("grid");
    expect(slot("quick-view-strip", dialog)?.getAttribute("aria-hidden")).toBe("true");
    expect(tokens(slot("quick-view-strip", dialog))).toContain("h-14");
    const body = slot("quick-view-body", dialog) as HTMLElement;
    expect(tokens(body)).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]));
    // `relative` makes the body the containing block of the hidden inputs and visually hidden parts in it, so
    // the popup (which clips with overflow hidden) never counts them as content that spills out of it.
    expect(tokens(body)).toContain("relative");
    // The body holds what a keyboard can reach, as axe's scrollable-region-focusable asks.
    expect(body.querySelector("a[href], button, input")).not.toBeNull();
    // The close button is in the popup, outside the body, so it never scrolls away.
    expect(body.contains(within(dialog).getByRole("button", { name: "Close" }))).toBe(false);
    // The picture sits beside the box from `md`, above it below.
    const columns = body.firstElementChild as HTMLElement;
    expect(tokens(columns)).toEqual(
      expect.arrayContaining(["grid", "grid-cols-1", "md:grid-cols-2", "min-w-0"]),
    );
  });

  it("takes the classes the design system caps it with, after its own", async () => {
    await openDialog("en", "ready", { popupClassName: "max-h-[calc(100%-2rem)] duration-0" });
    expect(tokens(popup())).toEqual(
      expect.arrayContaining(["max-h-[calc(100%-2rem)]", "duration-0"]),
    );
    expect(tokens(popup())).not.toContain("max-h-[calc(100dvh-2rem)]");
  });
});

describe("QuickViewDialog: the choice", () => {
  it("gives the gallery the values that are chosen, in the options' order", async () => {
    await openDialog("en", "ready");
    expect(lastGallery().selectedValueIds).toEqual(["colour-black", "size-m"]);
  });

  it.each([
    ["empty", []],
    ["partial", ["colour-oatmeal"]],
    ["low", ["colour-forest", "size-m"]],
    ["soldOut", ["colour-black", "size-xl"]],
  ] as const)("starts from the %s selection", async (state, values) => {
    await openDialog("en", state);
    expect(lastGallery().selectedValueIds).toEqual(values);
  });

  it("hands a pick to the gallery and the callback, so the picture follows the colour", async () => {
    const onSelectionChange = vi.fn();
    const { user } = await openDialog("en", "ready", { onSelectionChange });
    expect(onSelectionChange).not.toHaveBeenCalled();
    await user.click(within(popup() as HTMLElement).getByRole("radio", { name: "Forest green" }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ colour: "colour-forest", size: "size-m" });
    expect(lastGallery().selectedValueIds).toEqual(["colour-forest", "size-m"]);
    // The box shows it, too: one choice, in one place.
    expect(
      within(popup() as HTMLElement).getByRole("radiogroup", { name: "Color: Forest green" }),
    ).toBeTruthy();
    expect(slot("buy-box-stock")?.textContent).toBe("Only 3 left");
  });

  it("follows the selection prop, and keeps the shopper's pick for an equal one", async () => {
    const box = fixture("en", "ready");
    const { user, view } = await openDialog("en", "ready");
    await user.click(within(popup() as HTMLElement).getByRole("radio", { name: "Oatmeal" }));
    expect(lastGallery().selectedValueIds).toEqual(["colour-oatmeal", "size-m"]);
    view.rerender(element("en", "ready", { selection: { ...box.selection } }));
    expect(lastGallery().selectedValueIds).toEqual(["colour-oatmeal", "size-m"]);
    view.rerender(element("en", "ready", { selection: { colour: "colour-sky" } }));
    expect(lastGallery().selectedValueIds).toEqual(["colour-sky"]);
    expect(
      within(popup() as HTMLElement).getByRole("radiogroup", { name: "Color: Sky blue" }),
    ).toBeTruthy();
  });

  it("keeps the choice while it is closed and opened again", async () => {
    const { user, opener } = await openDialog("en", "ready");
    await user.click(within(popup() as HTMLElement).getByRole("radio", { name: "Oatmeal" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    await user.click(opener);
    await waitFor(() => expect(popup()).not.toBeNull());
    expect(
      within(popup() as HTMLElement).getByRole("radiogroup", { name: "Color: Oatmeal" }),
    ).toBeTruthy();
  });
});

describe("QuickViewDialog: adding from inside", () => {
  it("sends the choice with the box's own rules, and takes focus to what is missing", async () => {
    const action = vi.fn();
    const { user } = await openDialog("en", "empty", { action });
    const dialog = popup() as HTMLElement;
    const add = slot("buy-box-add", dialog) as HTMLElement;
    expect(add.getAttribute("aria-disabled")).toBe("true");
    await user.click(add);
    expect(action).not.toHaveBeenCalled();
    expect(focused()?.getAttribute("role")).toBe("radio");
    expect(dialog.contains(focused())).toBe(true);
    await user.click(within(dialog).getByRole("radio", { name: "Black" }));
    await user.click(within(dialog).getByRole("radio", { name: "S" }));
    await user.click(add);
    expect(action).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries((action.mock.calls[0]?.[0] as FormData).entries())).toEqual({
      "options.colour": "colour-black",
      "options.size": "size-s",
      quantity: "1",
      variantId: "var_heritage_hoodie_black_s",
    });
  });

  it("stays open after the box says added, with the words in its status region", async () => {
    const { view } = await openDialog("en", "ready", { action: () => undefined });
    view.rerender(element("en", "ready", { action: () => undefined, status: "added" }));
    expect(popup()).not.toBeNull();
    expect(slot("buy-box-status", popup() as HTMLElement)?.textContent).toBe("Added to cart");
    view.rerender(element("en", "ready", { action: () => undefined, status: "error" }));
    expect(popup()).not.toBeNull();
    expect(slot("buy-box-status", popup() as HTMLElement)?.textContent).toContain("Could not add");
  });

  it("holds the box while it adds", async () => {
    const action = vi.fn();
    const { user } = await openDialog("en", "ready", { action, status: "adding" });
    const add = slot("buy-box-add", popup() as HTMLElement) as HTMLElement;
    expect(add.getAttribute("aria-disabled")).toBe("true");
    await user.click(add);
    expect(action).not.toHaveBeenCalled();
  });
});

describe("QuickViewDialog: drawn open for the design system (D45)", () => {
  it("draws the popup open without taking the focus, and keeps the page reachable when it is not modal", () => {
    render(
      <>
        <button type="button">Before</button>
        {element("en", "empty", { defaultOpen: true, modal: false })}
      </>,
    );
    expect(popup()).not.toBeNull();
    expect(screen.getByRole("dialog", { name: "Heritage Hoodie" })).toBe(popup());
    expect(popup()?.contains(focused())).toBe(false);
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("takes the focus when a reader opens a popup drawn open, after closing it", async () => {
    const user = userEvent.setup();
    render(element("en", "empty", { defaultOpen: true, modal: false }));
    await user.click(within(popup() as HTMLElement).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(popup()).toBeNull());
    await user.click(trigger());
    await waitFor(() => expect(popup()).not.toBeNull());
    await waitFor(() => expect(popup()?.contains(focused())).toBe(true));
  });

  it("draws several open at once, each named by its own box", () => {
    render(
      <>
        {element("en", "empty", { defaultOpen: true, modal: false })}
        {element("en", "ready", { defaultOpen: true, modal: false })}
      </>,
    );
    const dialogs = screen.getAllByRole("dialog", { name: "Heritage Hoodie" });
    expect(dialogs).toHaveLength(2);
    const labels = dialogs.map((each) => each.getAttribute("aria-labelledby"));
    expect(new Set(labels).size).toBe(2);
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});

describe("QuickViewDialog: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s trigger, title and link, and cuts nothing",
    async (locale, long) => {
      const box = fixture(locale, "empty");
      const copy = copyOf(locale);
      await openDialog(locale, "empty", {
        product: { ...box.product, title: long.productName },
        copy: {
          ...copy,
          quickViewDialog: {
            ...copy.quickViewDialog,
            open: long.action,
            openLabel: `${long.action}: {title}`,
            details: long.linkLabel,
            close: long.hint,
          },
        },
      });
      expect(trigger().textContent).toBe(long.action);
      expect(trigger().getAttribute("aria-label")?.startsWith(long.action)).toBe(true);
      expect(tokens(trigger())).toEqual(expect.arrayContaining(["max-w-full", "wrap-anywhere"]));
      const dialog = screen.getByRole("dialog", { name: long.productName });
      expect(tokens(slot("buy-box-title", dialog))).toContain("wrap-anywhere");
      const details = within(dialog).getByRole("link", { name: long.linkLabel });
      expect(tokens(details)).toContain("wrap-anywhere");
      expect(within(dialog).getByRole("button", { name: long.hint })).toBeTruthy();
      expect(classesIn(dialog).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
      expect(plain(trigger().textContent)).toBe(plain(long.action));
    },
  );
});

describe("QuickViewDialog: the file (D49)", () => {
  const runtimeImports = (text: string) =>
    [...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
      (match) => match[1] ?? "",
    );

  it("is a client component that imports no catalog, no registry and no fixture", () => {
    const text = source("quick-view-dialog.tsx");
    expect(text).toMatch(/^"use client";?$/m);
    const imported = runtimeImports(text);
    expect(imported.filter((each) => each === "@shopblok/i18n")).toEqual([]);
    expect(imported.filter((each) => /@shopblok\/(?:registry|fixtures)/.test(each))).toEqual([]);
    expect(imported).toContain("@shopblok/i18n/format");
  });

  it("draws the gallery without zoom and with the thumbnails below, as the brief asks", () => {
    const text = source("quick-view-dialog.tsx");
    expect(text).toMatch(/<ProductGallery[\s\S]*?zoom=\{false\}/);
    expect(text).toMatch(/<ProductGallery[\s\S]*?thumbnails="below"/);
    expect(text).not.toMatch(/SizeGuide/);
  });

  it("writes no em dash", () => {
    for (const name of ["quick-view-dialog.tsx", "quick-view-dialog.test.tsx"]) {
      expect(source(name)).not.toContain(EM_DASH);
    }
  });
});

describe("QuickViewDialog: nothing happens by itself", () => {
  it("does not call onSelectionChange when it opens, renders again or follows a prop", async () => {
    const onSelectionChange = vi.fn();
    const { view } = await openDialog("en", "ready", { onSelectionChange });
    act(() => {
      view.rerender(
        element("en", "ready", { onSelectionChange, selection: { colour: "colour-forest" } }),
      );
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
