import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

describe("Checkbox", () => {
  it("keeps the kit's 16 px box and a 44 × 44 hit area around it (D32)", () => {
    render(<Checkbox aria-label="Gift wrap" />);
    const box = screen.getByRole("checkbox", { name: "Gift wrap" });
    expect(box.className).toContain("size-4");
    // The `::after` is placed from the padding box, 14 px inside the 1 px border: 14 px + 2 × 15 px
    // = 44 px each way (T31: `-inset-3.5` made it 42).
    expect(box.className).toContain("after:-inset-[15px]");
  });

  it("toggles with Space, and not with Enter", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox aria-label="Gift wrap" onCheckedChange={onCheckedChange} />);
    await user.tab();
    const box = screen.getByRole("checkbox", { name: "Gift wrap" });
    expect(document.activeElement).toBe(box);
    expect(box.getAttribute("aria-checked")).toBe("false");
    await user.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{Enter}");
    expect(box.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
    expect(box.className).toContain("focus-visible:ring-ring");
  });

  it("toggles when its label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Label className="min-h-11">
        <Checkbox />
        Gift wrap
      </Label>,
    );
    await user.click(screen.getByText("Gift wrap"));
    expect(screen.getByRole("checkbox", { name: "Gift wrap" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Gift wrap" disabled />);
    const box = screen.getByRole("checkbox", { name: "Gift wrap" });
    await user.click(box);
    await user.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect(box.getAttribute("aria-disabled") ?? box.getAttribute("data-disabled")).not.toBeNull();
  });

  it("is announced as invalid", () => {
    render(<Checkbox aria-label="Terms" aria-invalid="true" />);
    const box = screen.getByRole("checkbox", { name: "Terms" });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(box.className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("takes a long %s label", async (_locale, strings) => {
    const user = userEvent.setup();
    render(
      <Label>
        <Checkbox />
        {strings.helpText}
      </Label>,
    );
    await user.click(screen.getByText(strings.helpText));
    expect(
      screen.getByRole("checkbox", { name: strings.helpText }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});
