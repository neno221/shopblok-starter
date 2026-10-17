import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import { PortalContainerProvider } from "./portal-container";

function Example({
  label = "Women",
  ...root
}: { label?: string } & Omit<React.ComponentProps<typeof NavigationMenu>, "children">) {
  return (
    <NavigationMenu aria-label="Main" {...root}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/women/dresses">Dresses</NavigationMenuLink>
            <NavigationMenuLink href="/women/coats" active>
              Coats
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/sale">Sale</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=navigation-menu-content]");
const positionerBox = () => document.querySelector<HTMLElement>("[data-base-ui-portal] > div");
/** The popup Base UI draws inside the positioner (the content is inside its viewport). */
const popupBox = () => positionerBox()?.firstElementChild as HTMLElement | null | undefined;

describe("NavigationMenu", () => {
  it("has triggers and links at least 44 px tall (D32), with the ring at full strength (D35)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Women" });
    const sale = screen.getByRole("link", { name: "Sale" });
    for (const control of [trigger, sale]) {
      expect(control.className).toContain("min-h-11");
      expect(control.className).toContain("focus-visible:ring-ring");
      expect(control.className).not.toContain("ring-ring/");
      expect(control.className).not.toMatch(/(?:^|\s)h-9(?:\s|$)/);
    }
    expect(navigationMenuTriggerStyle()).toContain("min-h-11");
    await user.click(trigger);
    const dresses = await screen.findByRole("link", { name: "Dresses" });
    expect(dresses.className).toContain("min-h-11");
    expect(dresses.className).toContain("focus-visible:ring-ring");
  });

  it("does not switch the focus ring off inside its content", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    expect(popup()?.className).not.toMatch(/focus:ring-0|focus:outline-none/);
  });

  it.each(longLabels)("lets a long %s trigger label wrap", (_l, strings) => {
    render(<Example label={strings.action} />);
    const trigger = screen.getByRole("button", { name: strings.action });
    expect(trigger.className).not.toMatch(CLIPPING_CLASSES);
    expect(trigger.className).not.toContain("w-max");
  });

  it("opens on click, sits on the popover layer, and marks the current link", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Women" });
    await user.click(trigger);
    const coats = await screen.findByRole("link", { name: "Coats" });
    expect(coats.getAttribute("aria-current")).toBe("page");
    expect(coats.hasAttribute("data-active")).toBe(true);
    expect(coats.className).toContain("data-active:bg-muted/50");
    expect(screen.getByRole("link", { name: "Dresses" }).getAttribute("aria-current")).toBeNull();
    const positioner = document.querySelector<HTMLElement>("[data-base-ui-portal] > div");
    expect(positioner?.className).toContain("z-(--z-popover)");
  });

  it("takes only logical sides on the positioner (a type error, checked by tsc)", () => {
    const left = (
      // @ts-expect-error -- `left` is gone: use `inline-start`.
      <NavigationMenuPositioner side="left" />
    );
    const logical = <NavigationMenuPositioner side="inline-end" />;
    expect([left.props.side, logical.props.side]).toEqual(["left", "inline-end"]);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Women" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("link", { name: "Dresses" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Dresses" })).toBeNull());
    expect(document.activeElement).toBe(trigger);
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
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    expect(screen.getByTestId("box").contains(popup())).toBe(true);
  });

  it("drawn open on first render (the DS box: defaultValue), it lands in the container", async () => {
    function Boxed() {
      const [box, setBox] = React.useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBox} data-testid="box">
          <PortalContainerProvider container={box}>
            <NavigationMenu aria-label="Main" defaultValue="women">
              <NavigationMenuList>
                <NavigationMenuItem value="women">
                  <NavigationMenuTrigger>Women</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <NavigationMenuLink href="/women/dresses">Dresses</NavigationMenuLink>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </PortalContainerProvider>
        </div>
      );
    }
    render(<Boxed />);
    const link = await screen.findByRole("link", { name: "Dresses" });
    expect(screen.getByTestId("box").contains(link)).toBe(true);
  });

  it("draws its popup as a div: the root is the one navigation landmark", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(document.querySelectorAll("nav")).toHaveLength(1);
    expect(popupBox()?.tagName).toBe("DIV");
  });

  it("is as wide as its content by default: the positioner and the popup follow the popup's size", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    expect(positionerBox()?.className).toContain("w-(--positioner-width)");
    expect(positionerBox()?.className).not.toContain("w-(--anchor-width)");
    expect(popupBox()?.className).toContain("w-(--popup-width)");
    expect(popupBox()?.className).not.toContain("w-full");
  });

  it("is as wide as the root with `fullWidth`: the positioner takes the anchor's width", async () => {
    const rect = (width: number, height: number) =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON() {},
      }) as DOMRect;
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute("data-slot") === "navigation-menu" ? rect(1000, 48) : rect(90, 44);
      });
    try {
      const user = userEvent.setup();
      render(<Example fullWidth />);
      const trigger = screen.getByRole("button", { name: "Women" });
      trigger.focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("link", { name: "Dresses" });
      // The root, not the trigger, is the anchor: 1000 px, not 90.
      await waitFor(() =>
        expect(positionerBox()?.style.getPropertyValue("--anchor-width")).toBe("1000px"),
      );
      expect(positionerBox()?.className).toContain("w-(--anchor-width)");
      expect(positionerBox()?.className).toContain("h-auto");
      expect(positionerBox()?.className).not.toContain("w-(--positioner-width)");
      expect(popupBox()?.className).toContain("w-full");
      expect(popupBox()?.className).toContain("h-auto");
      expect(popupBox()?.className).not.toContain("w-(--popup-width)");
    } finally {
      spy.mockRestore();
    }
  });

  it.each([
    ["the ancestor `fullWidthAnchor` names", true, "1400px"],
    ["the root when nothing matches", false, "1000px"],
  ])("spans %s (PR 57 review)", async (_name, wrapped, width) => {
    const rect = (w: number) =>
      ({ x: 0, y: 0, left: 0, top: 0, right: w, bottom: 48, width: w, height: 48, toJSON() {} }) as DOMRect;
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const slot = this.getAttribute("data-slot");
        return rect(slot === "header-row" ? 1400 : slot === "navigation-menu" ? 1000 : 90);
      });
    try {
      const user = userEvent.setup();
      const menu = <Example fullWidth fullWidthAnchor='[data-slot="header-row"]' />;
      render(wrapped ? <div data-slot="header-row">{menu}</div> : menu);
      screen.getByRole("button", { name: "Women" }).focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("link", { name: "Dresses" });
      await waitFor(() =>
        expect(positionerBox()?.style.getPropertyValue("--anchor-width")).toBe(width),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("passes `positionerClassName` and `popupClassName` on, after its own classes", async () => {
    const user = userEvent.setup();
    render(<Example positionerClassName="z-50" popupClassName="rounded-t-none" />);
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    expect(positionerBox()?.className).toContain("z-50");
    expect(positionerBox()?.className).not.toContain("z-(--z-popover)");
    expect(popupBox()?.className).toContain("rounded-t-none");
    expect(popupBox()?.className).toContain("bg-popover");
  });

  it("moves nothing over time under prefers-reduced-motion: the positioner, popup and content", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Women" }));
    await screen.findByRole("link", { name: "Dresses" });
    for (const element of [positionerBox(), popupBox(), popup()]) {
      expect(element?.className).toContain("motion-reduce:transition-none");
    }
  });
});
