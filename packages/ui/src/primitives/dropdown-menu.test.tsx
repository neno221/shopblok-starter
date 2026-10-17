import { DirectionProvider } from "@base-ui/react/direction-provider";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../atoms/button";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { PortalContainerProvider } from "./portal-container";

function Example({
  accountLabel = "Account",
  onSelect,
  side,
  ...root
}: {
  accountLabel?: string;
  onSelect?: () => void;
  side?: React.ComponentProps<typeof DropdownMenuContent>["side"];
} & React.ComponentProps<typeof DropdownMenu>) {
  return (
    <>
      <button type="button">Before</button>
      <DropdownMenu {...root}>
        <DropdownMenuTrigger render={<Button />}>Open</DropdownMenuTrigger>
        <DropdownMenuContent side={side}>
          {/* Base UI needs a label inside a group (Radix did not). */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>My shop</DropdownMenuLabel>
            <DropdownMenuItem onClick={onSelect}>
              {accountLabel}
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Orders</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Gift wrap</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Standard delivery</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Express delivery</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Returns</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button">After</button>
    </>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=dropdown-menu-content]");

describe("DropdownMenu", () => {
  it("sits on the popover layer, on the popover tokens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("menu");
    expect(popup()?.className).toContain("z-(--z-popover)");
    expect(popup()?.parentElement?.className).toContain("z-(--z-popover)");
    expect(popup()?.className).toContain("bg-popover");
  });

  it("has items, checkbox items, radio items and a submenu trigger at least 44 px tall (D32)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("menu");
    const controls = [
      screen.getByRole("menuitem", { name: /Account/ }),
      screen.getByRole("menuitemcheckbox", { name: "Gift wrap" }),
      screen.getByRole("menuitemradio", { name: "Standard delivery" }),
      screen.getByRole("menuitem", { name: "More" }),
      screen.getByRole("menuitem", { name: "Sign out" }),
    ];
    for (const control of controls) expect(control.className).toContain("min-h-11");
  });

  it("takes only logical sides (a type error, checked by tsc)", () => {
    const left = (
      // @ts-expect-error -- `left` is gone: use `inline-start`.
      <DropdownMenuContent side="left">x</DropdownMenuContent>
    );
    const right = (
      // @ts-expect-error -- `right` is gone: use `inline-end`.
      <DropdownMenuSubContent side="right">x</DropdownMenuSubContent>
    );
    expect([left.props.side, right.props.side]).toEqual(["left", "right"]);
  });

  it("opens its submenu on the inline-end side, with a chevron that turns for right-to-left", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const more = await screen.findByRole("menuitem", { name: "More" });
    const chevron = more.querySelector("svg");
    expect(chevron?.getAttribute("class")).toContain("rtl:rotate-180");
    expect(chevron?.getAttribute("class")).toContain("ms-auto");
    expect(chevron?.getAttribute("aria-hidden")).toBe("true");
    more.focus();
    await user.keyboard("{ArrowRight}");
    const returns = await screen.findByRole("menuitem", { name: "Returns" });
    const sub = returns.closest("[data-slot=dropdown-menu-sub-content]");
    expect(sub?.getAttribute("data-side")).toBe("inline-end");
    expect(sub?.className).toContain("data-[side=inline-end]:slide-in-from-start-2");
  });

  it("opens the submenu with ArrowLeft in a right-to-left page, and reports the same logical side", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction="rtl">
        <Example />
      </DirectionProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const more = await screen.findByRole("menuitem", { name: "More" });
    more.focus();
    await user.keyboard("{ArrowLeft}");
    const returns = await screen.findByRole("menuitem", { name: "Returns" });
    expect(
      returns.closest("[data-slot=dropdown-menu-sub-content]")?.getAttribute("data-side"),
    ).toBe("inline-end");
  });

  it("has no physical class in its popups", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("menu");
    const classes = [
      popup()?.className,
      screen.getByRole("menuitem", { name: /Account/ }).className,
      screen.getByRole("menuitemcheckbox").className,
      screen.getByRole("menuitemradio", { name: "Standard delivery" }).className,
      document.querySelector("[data-slot=dropdown-menu-shortcut]")?.className,
    ].join(" ");
    expect(classes).not.toMatch(/data-\[side=(?:left|right)\]|slide-in-from-(?:left|right)/);
    expect(classes).not.toMatch(/(?:^|[\s:])(?:pl|pr|ml|mr|left|right)-/);
    expect(classes).not.toMatch(/dark:/);
    expect(document.querySelector("[data-slot=dropdown-menu-shortcut]")?.className).toContain(
      "ms-auto",
    );
    expect(
      document
        .querySelector("[data-slot=dropdown-menu-checkbox-item-indicator]")
        ?.className.includes("end-2"),
    ).toBe(true);
  });

  it("draws a highlighted destructive item solid (4.77:1), not as the kit's 10 % tint (4.01:1)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const item = await screen.findByRole("menuitem", { name: "Sign out" });
    expect(item.className).toContain("data-[variant=destructive]:focus:bg-destructive ");
    expect(item.className).toContain(
      "data-[variant=destructive]:focus:text-destructive-foreground",
    );
    expect(item.className).not.toMatch(/bg-destructive\/\d/);
  });

  it.each(longLabels)("lets a long %s label wrap", async (_l, strings) => {
    const user = userEvent.setup();
    render(<Example accountLabel={strings.action} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const item = await screen.findByRole("menuitem", {
      name: new RegExp(strings.action.slice(0, 12)),
    });
    expect(item.className).not.toMatch(CLIPPING_CLASSES);
    expect(item.className).toContain("min-h-11");
  });

  it("opens from the keyboard, moves with the arrows and picks with Enter; focus returns to the trigger", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Example onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /Account/ }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Orders" }));
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("works with modal={false}: the page behind stays reachable, Escape closes it", async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("menu");
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
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
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("menu");
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
    const menu = await screen.findByRole("menu");
    expect(screen.getByTestId("box").contains(menu)).toBe(true);
  });
});
