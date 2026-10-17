import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../atoms/button";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { PortalContainerProvider } from "./portal-container";

function Example({
  title = "Choose a size",
  closeText = "Done",
  ...root
}: { title?: string; closeText?: string } & React.ComponentProps<typeof Drawer>) {
  return (
    <>
      <button type="button">Before</button>
      <Drawer {...root}>
        <DrawerTrigger render={<Button />}>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>Sizes run small.</DrawerDescription>
          </DrawerHeader>
          <input aria-label="Size note" />
          <DrawerFooter>
            <DrawerClose render={<Button variant="outline" />}>{closeText}</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <button type="button">After</button>
    </>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=drawer-popup]");

describe("Drawer", () => {
  it("draws the overlay token, and backdrop, viewport and popup sit on the modal layer", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    const overlay = document.querySelector("[data-slot=drawer-overlay]");
    expect(overlay?.className).toContain("bg-overlay");
    expect(overlay?.className).toContain("z-(--z-modal)");
    expect(overlay?.className).not.toMatch(/bg-(?:black|white)/);
    expect(document.querySelector("[data-slot=drawer-viewport]")?.className).toContain(
      "z-(--z-modal)",
    );
    expect(popup()?.className).toContain("z-(--z-modal)");
  });

  it("is SPEC §9.4's bottom sheet: it swipes down by default, and up", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(popup()?.getAttribute("data-swipe-direction")).toBe("down");
    expect(popup()?.className).toContain("data-[swipe-direction=down]:bottom-0");
    unmount();
    render(<Example swipeDirection="up" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(popup()?.getAttribute("data-swipe-direction")).toBe("up");
    expect(popup()?.className).toContain("data-[swipe-direction=up]:top-0");
  });

  it("has no left or right variant: not as a type, not as a class (side panels are Sheet)", () => {
    const left = (
      // @ts-expect-error -- `left` is gone: a side panel is a Sheet.
      <Drawer swipeDirection="left">x</Drawer>
    );
    const right = (
      // @ts-expect-error -- `right` is gone: a side panel is a Sheet.
      <Drawer swipeDirection="right">x</Drawer>
    );
    expect([left.props.swipeDirection, right.props.swipeDirection]).toEqual(["left", "right"]);
  });

  it("carries no physical class and no horizontal axis", async () => {
    const user = userEvent.setup();
    render(<Example showSwipeHandle />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    const all = [
      popup()?.className,
      document.querySelector("[data-slot=drawer-swipe-handle]")?.className,
      document.querySelector("[data-slot=drawer-header]")?.className,
    ].join(" ");
    expect(all).not.toMatch(/swipe-direction=(?:left|right)|swipe-axis=x/);
    expect(all).not.toMatch(/(?:^|[\s:])(?:left|right)-|rounded-[lr]-|border-[lr](?:\s|$|-)/);
    expect(all).not.toMatch(/text-left/);
    expect(document.querySelector("[data-slot=drawer-header]")?.className).toContain(
      "md:text-start",
    );
  });

  it("draws an aria-hidden swipe handle only when asked", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=drawer-swipe-handle]")).toBeNull();
    unmount();
    render(<Example showSwipeHandle />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(
      document.querySelector("[data-slot=drawer-swipe-handle]")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("has no English of its own: its close is the DrawerClose the caller renders", async () => {
    const user = userEvent.setup();
    render(<Example closeText="Fermer" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Fermer" }).className).toContain("min-h-11");
    expect(dialog.textContent).not.toMatch(/close/i);
  });

  it.each(longLabels)("wraps a long %s title", async (_l, strings) => {
    const user = userEvent.setup();
    render(<Example title={strings.productDescription} closeText={strings.action} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const title = await screen.findByText(strings.productDescription);
    expect(title.className).not.toMatch(CLIPPING_CLASSES);
    expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
  });

  it("is a named dialog; focus moves inside when it opens, onto the popup itself", async () => {
    // Unlike Dialog, Base UI's Drawer focuses the popup, not its first field (so a drawer opened
    // by touch does not raise the keyboard). Tab then goes to the first field.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const drawer = await screen.findByRole("dialog", { name: "Choose a size" });
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(drawer);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Size note" }));
  });

  it("keeps Tab inside: Tab from the last focusable element wraps to the first", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const drawer = await screen.findByRole("dialog");
    const input = screen.getByRole("textbox", { name: "Size note" });
    const done = screen.getByRole("button", { name: "Done" });
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
    await user.tab();
    expect(document.activeElement).toBe(input);
    await user.tab();
    expect(document.activeElement).toBe(done);
    await user.tab();
    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(input);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(done);
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

  it("closes with its DrawerClose, focus back on the trigger (the way out that is not a swipe)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("works with modal={false}: opens without a backdrop, leaves the page reachable, closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=drawer-overlay]")).toBeNull();
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(popup()?.className).toContain("z-(--z-modal)");
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
    const drawer = await screen.findByRole("dialog");
    expect(screen.getByTestId("box").contains(drawer)).toBe(true);
  });
});
