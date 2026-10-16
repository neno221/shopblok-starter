import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const sizes = [
  { label: "Small", value: "s" },
  { label: "Medium", value: "m" },
  { label: "Large", value: "l" },
];

function Sizes({
  disabled = false,
  invalid = false,
  onValueChange,
}: {
  disabled?: boolean;
  invalid?: boolean;
  onValueChange?: (value: string | null) => void;
}) {
  return (
    <Select items={sizes} disabled={disabled} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Size" aria-invalid={invalid || undefined}>
        <SelectValue placeholder="Choose a size" />
      </SelectTrigger>
      <SelectContent>
        {sizes.map((size) => (
          <SelectItem key={size.value} value={size.value}>
            {size.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("is a combobox 44 px tall (D32) whose value says it truncates (D34)", () => {
    render(<Sizes />);
    const trigger = screen.getByRole("combobox", { name: "Size" });
    expect(trigger.className).toContain("h-11");
    expect(trigger.querySelector("[data-slot=select-value]")?.hasAttribute("data-truncate")).toBe(
      true,
    );
  });

  it("opens from the keyboard, moves with the arrows and picks with Enter", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Sizes onValueChange={onValueChange} />);
    await user.tab();
    const trigger = screen.getByRole("combobox", { name: "Size" });
    expect(document.activeElement).toBe(trigger);
    expect(trigger.className).toContain("focus-visible:ring-ring");
    await user.keyboard("{ArrowDown}");
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("option"));
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("m", expect.anything()));
    await waitFor(() => expect(trigger.textContent).toContain("Medium"));
  });

  it("gives each option at least 44 px (D32)", async () => {
    const user = userEvent.setup();
    render(<Sizes />);
    await user.click(screen.getByRole("combobox", { name: "Size" }));
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(3);
    for (const option of options) expect(option.className).toContain("min-h-11");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<Sizes disabled />);
    const trigger = screen.getByRole("combobox", { name: "Size" });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("is announced as invalid", () => {
    render(<Sizes invalid />);
    const trigger = screen.getByRole("combobox", { name: "Size" });
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("wraps a long %s option instead of cutting it", async (_locale, strings) => {
    const user = userEvent.setup();
    render(
      <Select items={[{ label: strings.placeholder, value: "a" }]}>
        <SelectTrigger aria-label={strings.fieldLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">{strings.placeholder}</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", { name: strings.fieldLabel }));
    const option = await screen.findByRole("option", { name: strings.placeholder });
    expect(option.innerHTML).not.toContain("whitespace-nowrap");
  });
});
