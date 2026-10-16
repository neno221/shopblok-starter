import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { QuantityStepper } from "./quantity-stepper";

const labels = {
  label: "Quantity",
  decrementLabel: "Decrease quantity",
  incrementLabel: "Increase quantity",
};

describe("QuantityStepper", () => {
  it("has an input and two buttons, named by their props, each at least 44 px (D32)", () => {
    render(<QuantityStepper {...labels} defaultValue={2} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    const minus = screen.getByRole("button", { name: "Decrease quantity" });
    const plus = screen.getByRole("button", { name: "Increase quantity" });
    expect((input as HTMLInputElement).value).toBe("2");
    expect(input.className).toContain("h-11");
    expect(minus.className).toContain("size-11");
    expect(plus.className).toContain("size-11");
  });

  it("steps with the buttons", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper {...labels} defaultValue={2} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(input.value).toBe("3");
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(input.value).toBe("1");
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([3, 2, 1]);
  });

  it("stops at the minimum and the maximum, and disables the button there", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper {...labels} defaultValue={1} min={1} max={2} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    const minus = screen.getByRole("button", { name: "Decrease quantity" });
    const plus = screen.getByRole("button", { name: "Increase quantity" });
    expect(minus.hasAttribute("disabled") || minus.getAttribute("aria-disabled") === "true").toBe(
      true,
    );
    await user.click(plus);
    expect(input.value).toBe("2");
    await user.click(plus);
    expect(input.value).toBe("2");
    expect(plus.hasAttribute("disabled") || plus.getAttribute("aria-disabled") === "true").toBe(
      true,
    );
  });

  it("steps with the arrow keys in the input, and clamps what is typed", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper {...labels} defaultValue={3} min={1} max={5} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("4");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input.value).toBe("2");
    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    expect(input.value).toBe("5");
  });

  it("is reached with Tab at its input (the buttons are for pointers, as the input has the arrows), and draws the ring at full strength", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper {...labels} defaultValue={2} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Quantity" }));
    expect(screen.getByRole("button", { name: "Decrease quantity" }).getAttribute("tabindex")).toBe(
      "-1",
    );
    const group = document.querySelector("[data-slot=quantity-stepper-group]");
    expect(group?.className).toContain("has-[:focus-visible]:ring-ring");
    expect(group?.className).not.toContain("ring-ring/");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper {...labels} defaultValue={2} disabled />);
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect((screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement).value).toBe("2");
  });

  it("requires the three labels", () => {
    // @ts-expect-error -- the labels are required (D30).
    render(<QuantityStepper />);
  });

  it.each(longLabels)("takes long %s labels", (_locale, strings) => {
    render(
      <QuantityStepper
        label={strings.fieldLabel}
        decrementLabel={strings.hint}
        incrementLabel={strings.optionLabel}
        defaultValue={2}
      />,
    );
    expect(screen.getByRole("textbox", { name: strings.fieldLabel })).toBeTruthy();
    expect(screen.getByRole("button", { name: strings.hint })).toBeTruthy();
    expect(screen.getByRole("button", { name: strings.optionLabel })).toBeTruthy();
  });
});
