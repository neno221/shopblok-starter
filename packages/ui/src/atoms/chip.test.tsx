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
