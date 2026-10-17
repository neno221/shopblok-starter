import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PortalContainerProvider } from "./portal-container";
import {
  Toast,
  ToastClose,
  ToastIcon,
  ToastKind,
  ToastViewport,
  Toaster,
  createToastManager,
  toast,
  toastLayout,
} from "./toast";

afterEach(() => {
  act(() => toast.close());
});

function Page(props: Partial<React.ComponentProps<typeof Toaster>>) {
  return (
    <Toaster label="Notifications" closeLabel="Close" {...props}>
      <button type="button">Page</button>
    </Toaster>
  );
}

/** Base UI marks the close button `aria-hidden`, which also empties its computed name. */
const closeButton = () => document.querySelector<HTMLElement>("[data-slot=toast-close]");

function add(options: Parameters<typeof toast.add>[0] = {}) {
  act(() => {
    toast.add({ title: "Added to cart", description: "One item.", timeout: 0, ...options });
  });
}

describe("Toaster", () => {
  it("names the notifications region with its label prop, not Base UI's English", async () => {
    render(<Page label="Benachrichtigungen" />);
    add();
    const region = await screen.findByRole("region", { name: "Benachrichtigungen" });
    expect(region.getAttribute("data-slot")).toBe("toast-viewport");
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });

  it("names each close button with its closeLabel prop, not 'Close toast'", async () => {
    render(<Page closeLabel="Schliessen" />);
    add();
    await screen.findByText("Added to cart");
    // Base UI marks the close button `aria-hidden` until the stack is expanded or the button has
    // focus (see the next test), so it is read by its attribute here.
    expect(closeButton()?.getAttribute("aria-label")).toBe("Schliessen");
    expect(document.body.innerHTML).not.toMatch(/close toast/i);
  });

  it("(Base UI) hides the close button from assistive technology until it has focus", async () => {
    render(<Page closeLabel="Schliessen" />);
    add();
    await screen.findByText("Added to cart");
    const close = closeButton();
    expect(close?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button", { name: "Schliessen" })).toBeNull();
    act(() => close?.focus());
    expect(close?.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByRole("button", { name: "Schliessen" })).toBe(close);
  });

  it("needs both labels (a type error, checked by tsc)", () => {
    const noLabels = (
      // @ts-expect-error -- `label` and `closeLabel` are required.
      <Toaster>x</Toaster>
    );
    const noClose = (
      // @ts-expect-error -- `closeLabel` is required.
      <Toaster label="Notifications">x</Toaster>
    );
    const noLabel = (
      // @ts-expect-error -- `label` is required.
      <Toaster closeLabel="Close">x</Toaster>
    );
    const complete = (
      <Toaster label="Notifications" closeLabel="Close">
        x
      </Toaster>
    );
    const viewport = (
      // @ts-expect-error -- the viewport's name is required.
      <ToastViewport />
    );
    const close = (
      // @ts-expect-error -- the close button's name is required.
      <ToastClose />
    );
    expect([noLabels, noClose, noLabel, complete, viewport, close]).toHaveLength(6);
  });

  it("keeps the export names providers rely on", () => {
    expect(typeof Toaster).toBe("function");
    expect(typeof toast.add).toBe("function");
    expect(typeof createToastManager).toBe("function");
  });

  it("sits on the toast layer", async () => {
    render(<Page />);
    add();
    const region = await screen.findByRole("region");
    expect(region.className).toContain("z-(--z-toast)");
    expect(region.className).not.toMatch(/(?:^|[\s:])(?:left|right)-|\bz-50\b/);
    expect(region.className).toContain("sm:end-4");
  });

  it("has a 44 px close button and a 44 px action (D32), and nothing smaller", async () => {
    render(<Page />);
    add({ actionProps: { children: "Undo" } });
    const action = await screen.findByRole("button", { name: "Undo" });
    const close = closeButton();
    expect(close?.className).toContain("size-11");
    expect(close?.className).not.toMatch(/after:-inset|icon-sm|size-(?:6|7|8|9)\b/);
    expect(action.className).toContain("min-h-11");
    expect(action.getAttribute("data-slot")).toBe("toast-action");
    // The toast's own ring is the full-strength one.
    const root = document.querySelector("[data-slot=toast]");
    expect(root?.className).toContain("focus-visible:ring-ring");
    expect(root?.className).not.toContain("ring-ring/");
    expect(root?.className).toContain("end-0");
  });

  it("reads the title and description as text, and closes with its button", async () => {
    const user = userEvent.setup();
    render(<Page />);
    add();
    expect(await screen.findByText("Added to cart")).toBeTruthy();
    expect(screen.getByText("One item.")).toBeTruthy();
    await user.click(closeButton() as HTMLElement);
    await waitFor(() => expect(screen.queryByText("Added to cart")).toBeNull());
  });

  it("draws an icon for its type that assistive technology skips", async () => {
    render(<Page />);
    add({ type: "success" });
    await screen.findByText("Added to cart");
    const icon = document.querySelector("[data-slot=toast-icon] svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it.each(longLabels)("lets a long %s title and action wrap", async (_l, strings) => {
    render(<Page closeLabel={strings.action} />);
    add({
      title: strings.productDescription,
      description: strings.helpText,
      actionProps: { children: strings.action },
    });
    const title = await screen.findByText(strings.productDescription);
    expect(title.className).not.toMatch(CLIPPING_CLASSES);
    expect(screen.getByText(strings.helpText).className).not.toMatch(CLIPPING_CLASSES);
    const buttons = screen.getAllByRole("button", { name: strings.action });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button.className).not.toMatch(CLIPPING_CLASSES);
  });

  it("takes its own manager", async () => {
    const mine = createToastManager();
    render(<Page toastManager={mine} />);
    act(() => {
      mine.add({ title: "Mine", timeout: 0 });
    });
    expect(await screen.findByText("Mine")).toBeTruthy();
    add({ title: "Shared" });
    expect(screen.queryByText("Shared")).toBeNull();
  });

  it("portals into the container the PortalContainerProvider names (D45)", async () => {
    function Boxed() {
      const [box, setBox] = React.useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBox} data-testid="box">
          <PortalContainerProvider container={box}>
            <Page />
          </PortalContainerProvider>
        </div>
      );
    }
    render(<Boxed />);
    add();
    const region = await screen.findByRole("region");
    expect(screen.getByTestId("box").contains(region)).toBe(true);
  });

  it("portals into <body> when no container is set", async () => {
    const { container } = render(<Page />);
    add();
    const region = await screen.findByRole("region");
    expect(container.contains(region)).toBe(false);
    expect(document.body.contains(region)).toBe(true);
  });

  it("composes a Toast by hand (the exports are parts)", () => {
    expect(typeof Toast).toBe("function");
  });
});

// T33: what `showToast` (molecules/toast) relies on.
describe("Toaster, for the Toast molecule (T33)", () => {
  it("says a toast's kind in words, from the `data.kindLabel` the caller took from the catalog", async () => {
    render(<Page />);
    add({ type: "success", data: { kindLabel: "Success" } });
    const kind = await screen.findByText("Success");
    expect(kind.getAttribute("data-slot")).toBe("toast-kind");
    expect(kind.tagName).toBe("P");
    // Above the title, in the same text column, in the foreground colour.
    const title = screen.getByText("Added to cart");
    expect(kind.parentElement).toBe(title.parentElement);
    expect(kind.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(kind.className).toContain("text-foreground");
  });

  it("draws no kind line without `data.kindLabel`, or with something that is not text", async () => {
    render(<Page />);
    add({ type: "success" });
    add({ type: "info", title: "Second", data: { kindLabel: 3 } });
    add({ type: "info", title: "Third", data: { kindLabel: "" } });
    await screen.findByText("Third");
    expect(document.querySelector("[data-slot=toast-kind]")).toBeNull();
  });

  it("is announced by the polite live region, kind and title together", async () => {
    render(<Page />);
    add({ type: "error", data: { kindLabel: "Error" } });
    const region = await screen.findByRole("region");
    expect(region.getAttribute("aria-live")).toBe("polite");
    const root = document.querySelector("[data-slot=toast]");
    expect(region.contains(root)).toBe(true);
    expect(root?.getAttribute("role")).toBe("dialog");
    expect(root?.getAttribute("aria-hidden")).toBeNull();
    expect(root?.textContent).toContain("Error");
    expect(root?.textContent).toContain("Added to cart");
  });

  it.each([
    ["success", "text-success"],
    ["info", "text-info"],
    ["warning", "text-warning"],
    ["error", "text-destructive"],
  ])("draws a %s icon in the token colour %s", (type, colour) => {
    const { container } = render(<ToastIcon type={type} />);
    const icon = container.querySelector("[data-slot=toast-icon] svg");
    expect(icon?.getAttribute("class")).toContain(colour);
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws no icon for a type it does not know", () => {
    const { container } = render(<ToastIcon type="mystery" />);
    expect(container.innerHTML).toBe("");
  });

  it("takes the kind line as a part of its own", () => {
    const { container } = render(<ToastKind>Information</ToastKind>);
    expect(container.querySelector("[data-slot=toast-kind]")?.textContent).toBe("Information");
  });

  it("puts the action under the text and the close button on the first row, whatever the words", async () => {
    render(<Page />);
    add({ type: "success", actionProps: { children: "Undo" } });
    const action = await screen.findByRole("button", { name: "Undo" });
    expect(action.className).toContain("row-start-2");
    expect(closeButton()?.className).toContain("row-start-1");
    expect(closeButton()?.className).toContain("col-start-3");
    const content = document.querySelector("[data-slot=toast-content]");
    expect(content?.className).toContain("grid");
    expect(content?.className).not.toMatch(/(?:^|\s)flex(?:\s|$)/);
    expect(Object.keys(toastLayout)).toEqual(["content", "icon", "text", "action", "close"]);
  });

  it("takes the close button out of the tab order while Base UI hides it from assistive technology", async () => {
    const user = userEvent.setup();
    render(<Page />);
    add({ type: "success", data: { kindLabel: "Success" } });
    await screen.findByText("Added to cart");
    const close = closeButton();
    expect(close?.getAttribute("aria-hidden")).toBe("true");
    expect(close?.getAttribute("tabindex")).toBe("-1");
    // Hovering the stack expands it: the button is visible to assistive technology and tabbable.
    const region = screen.getByRole("region");
    await user.hover(region);
    await waitFor(() => expect(closeButton()?.getAttribute("aria-hidden")).toBe("false"));
    expect(closeButton()?.getAttribute("tabindex")).not.toBe("-1");
  });

  it("lets a long title and description wrap anywhere, without a clipping class", async () => {
    render(<Page />);
    add({ type: "info", title: "x".repeat(60), description: "y".repeat(60) });
    const title = await screen.findByText("x".repeat(60));
    expect(title.className).toContain("wrap-anywhere");
    expect(title.className).not.toMatch(CLIPPING_CLASSES);
    expect(screen.getByText("y".repeat(60)).className).toContain("wrap-anywhere");
  });
});
