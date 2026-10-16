import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Label } from "./label";
import { NativeSelect, NativeSelectOption } from "./native-select";

function Sizes(props: React.ComponentProps<typeof NativeSelect>) {
  return (
    <>
      <Label htmlFor="size">Size</Label>
      <NativeSelect id="size" {...props}>
        <NativeSelectOption value="s">S</NativeSelectOption>
        <NativeSelectOption value="m">M</NativeSelectOption>
        <NativeSelectOption value="l">L</NativeSelectOption>
      </NativeSelect>
    </>
  );
}

describe("NativeSelect", () => {
  it("is a combobox named by its label, 44 px tall (D32), and says it truncates (D34)", () => {
    render(<Sizes />);
    const select = screen.getByRole("combobox", { name: "Size" });
    expect(select.className).toContain("h-11");
    expect(select.hasAttribute("data-truncate")).toBe(true);
  });

  it("changes from the keyboard and the pointer", async () => {
    const user = userEvent.setup();
    render(<Sizes />);
    const select = screen.getByRole("combobox", { name: "Size" }) as HTMLSelectElement;
    await user.tab();
    expect(document.activeElement).toBe(select);
    await user.selectOptions(select, "l");
    expect(select.value).toBe("l");
    expect(select.className).toContain("focus-visible:ring-ring");
  });

  it("is disabled", () => {
    render(<Sizes disabled />);
    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });

  it("is announced as invalid", () => {
    render(<Sizes aria-invalid="true" />);
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe("true");
  });

  it("draws its options on the popover tokens, not the system colours", () => {
    render(<Sizes />);
    for (const option of screen.getAllByRole("option")) {
      expect(option.className).toBe("bg-popover text-popover-foreground");
    }
  });

  it.each(longLabels)("takes a long %s label and option", (_locale, strings) => {
    render(
      <>
        <Label htmlFor="notes">{strings.fieldLabel}</Label>
        <NativeSelect id="notes">
          <NativeSelectOption value="a">{strings.placeholder}</NativeSelectOption>
        </NativeSelect>
      </>,
    );
    expect(screen.getByRole("combobox", { name: strings.fieldLabel })).toBeTruthy();
    expect(screen.getByRole("option", { name: strings.placeholder })).toBeTruthy();
  });
});
