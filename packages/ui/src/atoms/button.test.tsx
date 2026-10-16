import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("is a button named by its label, at least 44 px tall (D32)", () => {
    render(<Button>Add to cart</Button>);
    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button.className).toContain("min-h-11");
    expect(button.getAttribute("data-slot")).toBe("button");
  });

  it("has no size under 44 px: xs, sm, icon-xs and icon-sm are gone", () => {
    for (const size of ["xs", "sm", "icon-xs", "icon-sm"]) {
      // @ts-expect-error -- the sizes were removed on purpose (D32).
      expect(buttonVariants({ size })).not.toMatch(/\bh-(?:6|7|8|9|10)\b|\bsize-(?:6|7|8|9|10)\b/);
    }
    expect(buttonVariants({ size: "icon" })).toContain("size-11");
    expect(buttonVariants({ size: "lg" })).toContain("min-h-12");
  });

  it("is reached with Tab, draws the ring at full strength and fires on Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Pay</Button>);
    await user.tab();
    const button = screen.getByRole("button", { name: "Pay" });
    expect(document.activeElement).toBe(button);
    expect(button.className).toContain("focus-visible:ring-ring");
    expect(button.className).not.toContain("ring-ring/");
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("changes its fill on hover (default variant)", () => {
    render(<Button>Pay</Button>);
    expect(screen.getByRole("button").className).toContain("hover:bg-primary/80");
  });

  it("does nothing when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Pay" });
    expect(button).toHaveProperty("disabled", true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("marks an invalid state with the destructive border", () => {
    render(<Button aria-invalid="true">Pay</Button>);
    expect(screen.getByRole("button").className).toContain("aria-invalid:border-destructive");
  });

  it("draws destructive as a solid fill with its foreground token (4.77:1, not the tinted 4.01:1)", () => {
    expect(buttonVariants({ variant: "destructive" })).toContain(
      "bg-destructive text-destructive-foreground",
    );
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(<Button>{strings.action}</Button>);
    const button = screen.getByRole("button", { name: strings.action });
    expect(button.className).not.toMatch(CLIPPING_CLASSES);
  });
});
