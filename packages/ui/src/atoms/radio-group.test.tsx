import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

function Delivery({ disabledExpress = false }: { disabledExpress?: boolean }) {
  return (
    <RadioGroup aria-label="Delivery" defaultValue="standard">
      <Label className="min-h-11">
        <RadioGroupItem value="standard" />
        Standard
      </Label>
      <Label className="min-h-11">
        <RadioGroupItem value="express" disabled={disabledExpress} />
        Express
      </Label>
      <Label className="min-h-11">
        <RadioGroupItem value="pickup" />
        Pickup
      </Label>
    </RadioGroup>
  );
}

const checked = (name: string) => screen.getByRole("radio", { name }).getAttribute("aria-checked");

describe("RadioGroup", () => {
  it("is a named group of radios, each 16 px with a 44 × 44 hit area (D32)", () => {
    render(<Delivery />);
    expect(screen.getByRole("radiogroup", { name: "Delivery" })).toBeTruthy();
    const radio = screen.getByRole("radio", { name: "Standard" });
    expect(radio.className).toContain("size-4");
    expect(radio.className).toContain("after:-inset-3.5");
    expect(checked("Standard")).toBe("true");
  });

  it("moves the selection with the arrow keys, and Tab leaves the group", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Delivery />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Standard" }));
    await user.keyboard("{ArrowDown}");
    expect(checked("Express")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Express" }));
    await user.keyboard("{ArrowDown}");
    expect(checked("Pickup")).toBe("true");
    await user.keyboard("{ArrowUp}");
    expect(checked("Express")).toBe("true");
    expect(checked("Standard")).toBe("false");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("skips a disabled radio", async () => {
    const user = userEvent.setup();
    render(<Delivery disabledExpress />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(checked("Express")).toBe("false");
    expect(checked("Pickup")).toBe("true");
  });

  it("selects on a click on the label", async () => {
    const user = userEvent.setup();
    render(<Delivery />);
    await user.click(screen.getByText("Pickup"));
    expect(checked("Pickup")).toBe("true");
  });

  it("draws the ring at full strength and marks invalid", () => {
    render(
      <RadioGroup aria-label="Delivery">
        <RadioGroupItem value="a" aria-label="A" aria-invalid="true" />
      </RadioGroup>,
    );
    const radio = screen.getByRole("radio", { name: "A" });
    expect(radio.className).toContain("focus-visible:ring-ring");
    expect(radio.className).toContain("aria-invalid:border-destructive");
  });

  it.each(longLabels)("takes a long %s label", async (_locale, strings) => {
    const user = userEvent.setup();
    render(
      <RadioGroup aria-label={strings.fieldLabel}>
        <Label>
          <RadioGroupItem value="a" />
          {strings.placeholder}
        </Label>
      </RadioGroup>,
    );
    await user.click(screen.getByText(strings.placeholder));
    expect(checked(strings.placeholder)).toBe("true");
  });
});
