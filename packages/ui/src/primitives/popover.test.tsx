import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../atoms/button";
import { longLabels } from "../test-support/long-labels";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
import { PortalContainerProvider } from "./portal-container";

function Example({
  side,
  title = "Delivery",
  ...root
}: {
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  title?: string;
} & React.ComponentProps<typeof Popover>) {
  return (
    <>
      <button type="button">Before</button>
      <Popover {...root}>
        <PopoverTrigger render={<Button />}>Open</PopoverTrigger>
        <PopoverContent side={side}>
          <PopoverHeader>
            <PopoverTitle>{title}</PopoverTitle>
            <PopoverDescription>Arrives in two days.</PopoverDescription>
          </PopoverHeader>
          <Button variant="outline">Track</Button>
        </PopoverContent>
      </Popover>
      <button type="button">After</button>
    </>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=popover-content]");

describe("Popover", () => {
  it("sits on the popover layer, on the popover tokens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Arrives in two days.");
    expect(popup()?.className).toContain("z-(--z-popover)");
    expect(popup()?.parentElement?.className).toContain("z-(--z-popover)");
    expect(popup()?.className).toContain("bg-popover");
    expect(popup()?.className).toContain("text-popover-foreground");
  });

  it("takes only logical sides (a type error, checked by tsc)", () => {
    const left = (
      // @ts-expect-error -- `left` is gone: use `inline-start`.
      <PopoverContent side="left">x</PopoverContent>
    );
    const right = (
      // @ts-expect-error -- `right` is gone: use `inline-end`.
      <PopoverContent side="right">x</PopoverContent>
    );
    const logical = [
      <PopoverContent key="a" side="inline-start">
        x
      </PopoverContent>,
      <PopoverContent key="b" side="inline-end">
        x
      </PopoverContent>,
    ];
    expect([left.props.side, right.props.side, logical.length]).toEqual(["left", "right", 2]);
  });

  it("reports the logical side it was given, and slides in along it", async () => {
    const user = userEvent.setup();
    render(<Example side="inline-end" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Arrives in two days.");
    expect(popup()?.getAttribute("data-side")).toBe("inline-end");
    const classes = popup()?.className ?? "";
    expect(classes).toContain("data-[side=inline-end]:slide-in-from-start-2");
    expect(classes).toContain("data-[side=inline-start]:slide-in-from-end-2");
    expect(classes).not.toMatch(/data-\[side=(?:left|right)\]|slide-in-from-(?:left|right)/);
  });

  it("opens below its trigger by default", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Arrives in two days.");
    expect(popup()?.getAttribute("data-side")).toBe("bottom");
  });

  it.each(longLabels)("shows a long %s title", async (_l, strings) => {
    const user = userEvent.setup();
    render(<Example title={strings.productDescription} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText(strings.productDescription)).toBeTruthy();
    expect(popup()?.className).not.toMatch(/whitespace-nowrap|truncate/);
  });

  it("opens from the keyboard and moves focus inside", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Delivery" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Track" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
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
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("works with modal={false}: the page behind stays reachable, Escape closes it", async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "After" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
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
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByTestId("box").contains(dialog)).toBe(true);
  });
});
