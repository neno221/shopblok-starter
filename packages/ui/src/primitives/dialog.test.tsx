import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../atoms/button";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { PortalContainerProvider } from "./portal-container";

function Example({
  title = "Gift message",
  closeLabel = "Close",
  ...root
}: { title?: string; closeLabel?: string } & React.ComponentProps<typeof Dialog>) {
  return (
    <>
      <button type="button">Before</button>
      <Dialog {...root}>
        <DialogTrigger render={<Button />}>Open</DialogTrigger>
        <DialogContent closeLabel={closeLabel}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Printed on the card.</DialogDescription>
          </DialogHeader>
          <input aria-label="Message" />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <button type="button">After</button>
    </>
  );
}

const popup = () => document.querySelector<HTMLElement>("[data-slot=dialog-content]");

describe("Dialog", () => {
  it("draws the overlay token on the modal layer, with no black or white", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const overlay = document.querySelector("[data-slot=dialog-overlay]");
    expect(overlay?.className).toContain("bg-overlay");
    expect(overlay?.className).toContain("z-(--z-modal)");
    expect(overlay?.className).not.toMatch(/bg-(?:black|white)/);
    expect(popup()?.className).toContain("z-(--z-modal)");
    expect(popup()?.className).toContain("bg-popover");
  });

  it("centres with inset-x-0 and mx-auto, not left-1/2, so it centres in either direction", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(popup()?.className).toContain("inset-x-0");
    expect(popup()?.className).toContain("mx-auto");
    expect(popup()?.className).not.toMatch(/(?:^|\s)(?:left|right)-/);
  });

  it("names its close button with the closeLabel prop, at 44 px (D32)", async () => {
    const user = userEvent.setup();
    render(<Example closeLabel="Fermer" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const close = await screen.findByRole("button", { name: "Fermer" });
    expect(close.className).toContain("size-11");
    expect(close.className).toContain("end-2");
    expect(close.getAttribute("data-slot")).toBe("dialog-close");
    // No English is left behind in the markup.
    expect(popup()?.textContent).not.toContain("Close");
  });

  it("needs a closeLabel while the close button is shown (a type error, checked by tsc)", () => {
    const missing = (
      // @ts-expect-error -- `closeLabel` is required unless `showCloseButton` is false.
      <DialogContent>x</DialogContent>
    );
    const hidden = <DialogContent showCloseButton={false}>x</DialogContent>;
    const withLabel = <DialogContent closeLabel="Fermer">x</DialogContent>;
    const footer = (
      // @ts-expect-error -- the footer's close button needs its text too.
      <DialogFooter showCloseButton />
    );
    const footerWithLabel = <DialogFooter showCloseButton closeLabel="Fermer" />;
    expect([missing, hidden, withLabel, footer, footerWithLabel]).toHaveLength(5);
  });

  it("shows no close button when showCloseButton is false, and the footer one is named by its prop", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger render={<Button />}>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter showCloseButton closeLabel="Schliessen" />
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("button", { name: "Schliessen" })).toBeTruthy();
    expect(document.querySelectorAll("[data-slot=dialog-close]")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /schliessen|close/i })).toHaveLength(1);
  });

  it.each(longLabels)(
    "wraps a long %s title and keeps the popup scrollable",
    async (_l, strings) => {
      const user = userEvent.setup();
      render(<Example title={strings.productDescription} closeLabel={strings.action} />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      const title = await screen.findByText(strings.productDescription);
      expect(title.className).toContain("leading-snug");
      expect(title.className).not.toMatch(CLIPPING_CLASSES);
      expect(popup()?.className).toContain("overflow-y-auto");
      expect(popup()?.className).toContain("max-h-[calc(100dvh-2rem)]");
      expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
    },
  );

  it("is a named dialog; focus moves inside when it opens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Gift message" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    // The first focusable element inside, not the popup.
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Message" }));
  });

  it("keeps Tab inside: Tab from the last focusable element wraps to the first", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    const input = screen.getByRole("textbox", { name: "Message" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const close = screen.getByRole("button", { name: "Close" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    await user.tab();
    expect(document.activeElement).toBe(cancel);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(input);
    // And backwards: Shift+Tab from the first wraps to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(close);
  });

  it("hides the page behind from assistive technology while it is modal", async () => {
    // Base UI marks the page `aria-hidden` and `data-base-ui-inert` (not the `inert` attribute);
    // the focus guards and the backdrop keep keyboard and pointer out.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    const behind = screen.getByText("Before").closest("[data-base-ui-inert]");
    expect(behind?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button", { name: "Before" })).toBeNull();
    expect(screen.queryByRole("button", { name: "After" })).toBeNull();
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

  it("opens from the keyboard and closes with its own button, focus back on the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("works with modal={false}: opens, leaves the page reachable, closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "After" })).toBeTruthy();
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
    const box = screen.getByTestId("box");
    expect(box.contains(popup())).toBe(true);
    expect(box.contains(document.querySelector("[data-slot=dialog-overlay]"))).toBe(true);
  });

  it("drawn open on first render (the DS box: defaultOpen, modal={false}), it still lands in the container", async () => {
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

  it("portals into <body> when no container is set", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(container.contains(popup())).toBe(false);
    expect(document.body.contains(popup())).toBe(true);
  });
});
