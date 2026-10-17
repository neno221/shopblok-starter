import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../atoms/button";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PortalContainerProvider } from "./portal-container";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "./sheet";

function Example({
  side,
  title = "Your cart",
  closeLabel = "Close",
  ...root
}: { side?: SheetSide; title?: string; closeLabel?: string } & React.ComponentProps<typeof Sheet>) {
  return (
    <>
      <button type="button">Before</button>
      <Sheet {...root}>
        <SheetTrigger render={<Button />}>Open</SheetTrigger>
        <SheetContent side={side} closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Two items.</SheetDescription>
          </SheetHeader>
          <input aria-label="Coupon" />
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>Keep shopping</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <button type="button">After</button>
    </>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=sheet-content]");

describe("Sheet", () => {
  it("draws the overlay token on the modal layer, with no black or white", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const overlay = document.querySelector("[data-slot=sheet-overlay]");
    expect(overlay?.className).toContain("bg-overlay");
    expect(overlay?.className).toContain("z-(--z-modal)");
    expect(overlay?.className).not.toMatch(/bg-(?:black|white)/);
    expect(popup()?.className).toContain("z-(--z-modal)");
  });

  it("opens on the end side by default, and takes the four logical sides", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(popup()?.getAttribute("data-side")).toBe("inline-end");
    unmount();
    for (const side of ["top", "bottom", "inline-start", "inline-end"] as const) {
      const view = render(<Example side={side} />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      expect(popup()?.getAttribute("data-side")).toBe(side);
      view.unmount();
    }
  });

  it("takes only logical sides (a type error, checked by tsc)", () => {
    const left = (
      // @ts-expect-error -- `left` is gone: use `inline-start`.
      <SheetContent side="left" closeLabel="x">
        x
      </SheetContent>
    );
    const right = (
      // @ts-expect-error -- `right` is gone: use `inline-end`.
      <SheetContent side="right" closeLabel="x">
        x
      </SheetContent>
    );
    expect([left.props.side, right.props.side]).toEqual(["left", "right"]);
  });

  it("styles each side with logical classes, and flips the slide for right-to-left", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const classes = popup()?.className ?? "";
    for (const expected of [
      "data-[side=inline-end]:end-0",
      "data-[side=inline-end]:border-s",
      "data-[side=inline-start]:start-0",
      "data-[side=inline-start]:border-e",
      "data-[side=bottom]:bottom-0",
      "data-[side=top]:top-0",
      // The slide is toward the sheet's own edge, which `rtl:` mirrors.
      "data-[side=inline-end]:data-starting-style:translate-x-[2.5rem]",
      "rtl:data-[side=inline-end]:data-starting-style:translate-x-[-2.5rem]",
      "data-[side=inline-start]:data-starting-style:translate-x-[-2.5rem]",
      "rtl:data-[side=inline-start]:data-starting-style:translate-x-[2.5rem]",
    ]) {
      expect(classes).toContain(expected);
    }
    expect(classes).not.toMatch(/data-\[side=(?:left|right)\]/);
    expect(classes).not.toMatch(/(?:^|[\s:])(?:left|right)-|border-[lr](?:\s|$|-)/);
  });

  it("names its close button with the closeLabel prop, at 44 px (D32)", async () => {
    const user = userEvent.setup();
    render(<Example closeLabel="Fermer" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const close = await screen.findByRole("button", { name: "Fermer" });
    expect(close.className).toContain("size-11");
    expect(close.className).toContain("end-2");
    expect(popup()?.textContent).not.toContain("Close");
  });

  it("needs a closeLabel while the close button is shown (a type error, checked by tsc)", () => {
    const missing = (
      // @ts-expect-error -- `closeLabel` is required unless `showCloseButton` is false.
      <SheetContent>x</SheetContent>
    );
    const hidden = <SheetContent showCloseButton={false}>x</SheetContent>;
    expect([missing, hidden]).toHaveLength(2);
  });

  it("shows no close button when showCloseButton is false", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger render={<Button />}>Open</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(document.querySelectorAll("[data-slot=sheet-close]")).toHaveLength(0);
  });

  it("keeps a title out from under the 44 px close button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(document.querySelector("[data-slot=sheet-header]")?.className).toContain("pe-14");
  });

  it.each(longLabels)("wraps a long %s title", async (_l, strings) => {
    const user = userEvent.setup();
    render(<Example title={strings.productDescription} closeLabel={strings.action} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const title = await screen.findByText(strings.productDescription);
    expect(title.className).toContain("leading-snug");
    expect(title.className).not.toMatch(CLIPPING_CLASSES);
    expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
  });

  it("is a named dialog; focus moves inside when it opens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const sheet = await screen.findByRole("dialog", { name: "Your cart" });
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Coupon" }));
  });

  it("keeps Tab inside: Tab from the last focusable element wraps to the first", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const sheet = await screen.findByRole("dialog");
    const input = screen.getByRole("textbox", { name: "Coupon" });
    const keep = screen.getByRole("button", { name: "Keep shopping" });
    const close = screen.getByRole("button", { name: "Close" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    await user.tab();
    expect(document.activeElement).toBe(keep);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(sheet.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(input);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(close);
  });

  it("hides the page behind from assistive technology while it is modal", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    const behind = screen.getByText("Before").closest("[data-base-ui-inert]");
    expect(behind?.getAttribute("aria-hidden")).toBe("true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("works with modal={false}: opens, leaves the page reachable, closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("portals into the container the PortalContainerProvider names (D45)", async () => {
    const user = userEvent.setup();
    function Boxed() {
      const [box, setBox] = React.useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBox} data-testid="box">
          <PortalContainerProvider container={box}>
            <Example />
          </PortalContainerProvider>
        </div>
      );
    }
    render(<Boxed />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(screen.getByTestId("box").contains(popup())).toBe(true);
  });

  it("drawn open on first render (the DS box: defaultOpen, modal={false}), it lands in the container", async () => {
    function Boxed() {
      const [box, setBox] = React.useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBox} data-testid="box">
          <PortalContainerProvider container={box}>
            <Example defaultOpen modal={false} />
          </PortalContainerProvider>
        </div>
      );
    }
    render(<Boxed />);
    const sheet = await screen.findByRole("dialog");
    expect(screen.getByTestId("box").contains(sheet)).toBe(true);
  });
});
