import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
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
});
