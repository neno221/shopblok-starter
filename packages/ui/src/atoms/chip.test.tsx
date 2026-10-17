import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Chip } from "./chip";

describe("Chip", () => {
  it("shows its text and has no button without onRemove", () => {
    render(<Chip>Organic cotton</Chip>);
    expect(screen.getByText("Organic cotton")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has a remove button named by removeLabel, with a 44 × 44 px box (D32)", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Chip onRemove={onRemove} removeLabel="Remove">
        Organic cotton
      </Chip>,
    );
    const button = screen.getByRole("button", { name: "Remove" });
    expect(button.className).toContain("size-11");
    await user.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("is reached with Tab and removed with Enter or Space, the ring at full strength", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Chip onRemove={onRemove} removeLabel="Remove">
        Organic cotton
      </Chip>,
    );
    await user.tab();
    const button = screen.getByRole("button", { name: "Remove" });
    expect(document.activeElement).toBe(button);
    expect(button.className).toContain("focus-visible:ring-ring");
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it("needs a removeLabel with onRemove, and an onRemove with a removeLabel", () => {
    // @ts-expect-error -- the remove button has no name without `removeLabel` (D30).
    render(<Chip onRemove={() => {}}>A</Chip>);
    // @ts-expect-error -- a label for a button that is not there.
    render(<Chip removeLabel="Remove">B</Chip>);
  });

  describe("removed by a link (removeHref, T33)", () => {
    it("has a link named by removeLabel in place of the button, with the same 44 × 44 px box", () => {
      render(
        <Chip removeHref="/us/store?size=m" removeLabel="Remove Color: Black" prefetch={false}>
          Color: Black
        </Chip>,
      );
      const link = screen.getByRole("link", { name: "Remove Color: Black" });
      expect(link.getAttribute("href")).toBe("/us/store?size=m");
      expect(link.getAttribute("data-slot")).toBe("chip-remove");
      expect(link.className).toContain("size-11");
      expect(link.className).toContain("focus-visible:ring-ring");
      expect(link.className).not.toContain("ring-ring/");
      expect(screen.queryByRole("button")).toBeNull();
      // The cross is a picture: the name is the link's.
      expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("keeps the chip 32 px tall and trims the end padding, as the button does", () => {
      render(
        <Chip removeHref="/store" removeLabel="Remove" data-testid="chip">
          A
        </Chip>,
      );
      const chip = screen.getByTestId("chip");
      expect(chip.className).toContain("min-h-8");
      expect(chip.className).toContain("pe-1");
      expect(screen.getByRole("link").className).toContain("-my-1.5");
    });

    it("is reached with Tab, and nothing else in the chip is a control", async () => {
      const user = userEvent.setup();
      render(
        <Chip removeHref="/store" removeLabel="Remove">
          Organic cotton
        </Chip>,
      );
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Remove" }));
      await user.tab();
      expect(document.activeElement).toBe(document.body);
    });

    it("needs a removeLabel, and takes either a link or a handler, never both", () => {
      // @ts-expect-error -- the remove link has no name without `removeLabel` (D30).
      render(<Chip removeHref="/store">A</Chip>);
      render(
        // @ts-expect-error -- a chip is removed by a handler or by a link, not by both.
        <Chip removeHref="/store" onRemove={() => {}} removeLabel="Remove">
          B
        </Chip>,
      );
      render(
        // @ts-expect-error -- `prefetch` belongs to the link.
        <Chip onRemove={() => {}} removeLabel="Remove" prefetch={false}>
          C
        </Chip>,
      );
    });

    it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
      render(
        <Chip removeHref="/store" removeLabel="Remove" data-testid="chip">
          {strings.chipLabel}
        </Chip>,
      );
      expect(screen.getByTestId("chip").className).toContain("max-w-full");
      expect(screen.getByText(strings.chipLabel).className).not.toMatch(CLIPPING_CLASSES);
    });
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(
      <Chip onRemove={() => {}} removeLabel="Remove" data-testid="chip">
        {strings.chipLabel}
      </Chip>,
    );
    const chip = screen.getByTestId("chip");
    expect(chip.className).toContain("max-w-full");
    expect(chip.className).not.toMatch(CLIPPING_CLASSES);
    expect(screen.getByText(strings.chipLabel).className).not.toMatch(CLIPPING_CLASSES);
  });
});
