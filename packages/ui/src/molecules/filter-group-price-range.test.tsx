import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PriceRange, type PriceRangeProps } from "./filter-group-price-range";

// Base UI keeps a slider thumb `visibility: hidden` until it has measured it, and happy-dom has no
// layout, so the thumbs are found with `hidden: true` and moved with events, not with Tab.
const base: PriceRangeProps = {
  id: "price",
  currencyCode: "EUR",
  min: 0,
  max: 150,
  selected: { min: 20, max: 100 },
  locale: "en-IE",
  minimumLabel: "Minimum price",
  maximumLabel: "Maximum price",
  boundsText: "Prices from €0.00 to €150.00",
};

function setup(extra: Partial<PriceRangeProps> = {}) {
  return render(
    <form>
      <PriceRange {...base} {...extra} />
    </form>,
  );
}

const thumbs = () => screen.getAllByRole("slider", { hidden: true }) as HTMLInputElement[];
const lowField = () =>
  screen.getByRole("spinbutton", { name: "Minimum price" }) as HTMLInputElement;
const highField = () =>
  screen.getByRole("spinbutton", { name: "Maximum price" }) as HTMLInputElement;
const values = () => thumbs().map((thumb) => thumb.value);
const sent = () =>
  [...new FormData(document.querySelector("form") as HTMLFormElement).entries()].map(
    ([name, value]) => `${name}=${String(value)}`,
  );

/** Types into a field the way a visitor does: select what is there, type, and leave the field. */
async function typeInto(field: HTMLInputElement, text: string, leave = true) {
  const user = userEvent.setup();
  await user.clear(field);
  if (text !== "") await user.type(field, text);
  if (leave) await user.tab();
}

describe("PriceRange", () => {
  describe("what it draws", () => {
    it("is a slider with two named thumbs and two number fields", () => {
      setup();
      expect(thumbs().map((thumb) => thumb.getAttribute("aria-label"))).toEqual([
        "Minimum price",
        "Maximum price",
      ]);
      expect(lowField().type).toBe("number");
      expect(highField().type).toBe("number");
    });

    it("names the fields for the form: {id}.min and {id}.max, in major units", () => {
      setup({ id: "cost" });
      expect(lowField().name).toBe("cost.min");
      expect(highField().name).toBe("cost.max");
      expect(sent()).toEqual(["cost.min=20", "cost.max=100"]);
    });

    it("gives the fields the slider's ends as their limits and as placeholders", () => {
      setup();
      for (const field of [lowField(), highField()]) {
        expect(field.min).toBe("0");
        expect(field.max).toBe("150");
        expect(field.step).toBe("any");
        expect(field.getAttribute("inputmode")).toBe("decimal");
      }
      expect(lowField().placeholder).toBe("0");
      expect(highField().placeholder).toBe("150");
    });

    it("says what the ends are, and describes both fields by it", () => {
      setup();
      const bounds = document.querySelector("[data-slot=filter-range-bounds]") as HTMLElement;
      expect(bounds.textContent).toBe(base.boundsText);
      expect(lowField().getAttribute("aria-describedby")).toBe(bounds.id);
      expect(highField().getAttribute("aria-describedby")).toBe(bounds.id);
    });

    it("labels each field with a visible label, 44 px tall controls", () => {
      setup();
      expect(screen.getByText("Minimum price", { selector: "label" })).toBeTruthy();
      expect(lowField().className).toContain("h-11");
      expect(highField().className).toContain("h-11");
    });

    it("sets the thumbs apart enough for the 44 px hit areas to stay inside the column", () => {
      setup();
      const slider = document.querySelector("[data-slot=slider]") as HTMLElement;
      expect(slider.parentElement?.className).toContain("px-4");
    });

    it("makes the hidden range inputs as big as the thumb's 44 px hit area", () => {
      setup();
      const classes = document.querySelector("[data-slot=slider]")?.className ?? "";
      expect(classes).toContain("[&_[data-slot=slider-thumb]>input]:size-11!");
      expect(classes).toContain("[&_[data-slot=slider-thumb]>input]:-translate-x-[15px]!");
      expect(classes).toContain("[&_[data-slot=slider-thumb]>input]:-translate-y-[15px]!");
    });

    it("speaks a thumb's value as money in the market's language", () => {
      setup({ locale: "de-DE" });
      expect(thumbs().map((thumb) => thumb.getAttribute("aria-valuetext"))).toEqual([
        "20,00\u00a0€",
        "100,00\u00a0€",
      ]);
    });

    it("draws no slider when the ends are the same, and the fields still work", () => {
      setup({ min: 50, max: 50, selected: undefined });
      expect(document.querySelector("[data-slot=slider]")).toBeNull();
      expect(screen.queryAllByRole("slider", { hidden: true })).toHaveLength(0);
      expect(lowField()).toBeTruthy();
      expect(highField()).toBeTruthy();
    });
  });

  describe("the starting values", () => {
    it("fills the fields and the thumbs with the chosen range", () => {
      setup();
      expect(lowField().value).toBe("20");
      expect(highField().value).toBe("100");
      expect(values()).toEqual(["20", "100"]);
    });

    it("leaves the fields empty, and the thumbs at the ends, for a range nobody chose", () => {
      setup({ selected: undefined });
      expect(lowField().value).toBe("");
      expect(highField().value).toBe("");
      expect(values()).toEqual(["0", "150"]);
      expect(sent()).toEqual(["price.min=", "price.max="]);
    });

    it("empties a field whose chosen value is the end of the slider: that is no limit", () => {
      const { unmount } = setup({ selected: { min: 0, max: 100 } });
      expect(lowField().value).toBe("");
      expect(highField().value).toBe("100");
      unmount();
      setup({ selected: { min: 20, max: 150 } });
      expect(lowField().value).toBe("20");
      expect(highField().value).toBe("");
    });
  });

  describe("typing a number", () => {
    it("moves the thumb", async () => {
      setup();
      await typeInto(lowField(), "35");
      expect(values()).toEqual(["35", "100"]);
      await typeInto(highField(), "120");
      expect(values()).toEqual(["35", "120"]);
      expect(sent()).toEqual(["price.min=35", "price.max=120"]);
    });

    it("moves the thumb as the digits arrive, not only when the field is left", async () => {
      setup();
      await typeInto(lowField(), "45", false);
      expect(values()).toEqual(["45", "100"]);
    });

    it("keeps the thumbs in order while a field is past the other", async () => {
      setup();
      await typeInto(lowField(), "130", false);
      expect(values()).toEqual(["100", "130"]);
    });

    it("pulls a minimum that passed the maximum back to it when the field is left", async () => {
      setup();
      await typeInto(lowField(), "130");
      expect(lowField().value).toBe("100");
      expect(values()).toEqual(["100", "100"]);
    });

    it("pushes a maximum that fell below the minimum up to it when the field is left", async () => {
      setup();
      await typeInto(highField(), "5");
      expect(highField().value).toBe("20");
      expect(values()).toEqual(["20", "20"]);
    });

    it("clamps a number past the end of the slider, and a number at the end means no limit", async () => {
      setup();
      await typeInto(highField(), "900");
      expect(highField().value).toBe("");
      expect(values()).toEqual(["20", "150"]);
      await typeInto(lowField(), "-4");
      expect(lowField().value).toBe("");
      expect(values()).toEqual(["0", "150"]);
      expect(sent()).toEqual(["price.min=", "price.max="]);
    });

    it("keeps a decimal", async () => {
      setup();
      await typeInto(lowField(), "19.5");
      expect(lowField().value).toBe("19.5");
      // The thumb goes by whole units (a browser snaps its input to the step); the field keeps the cents.
      expect(Math.round(Number(values()[0]))).toBe(20);
    });

    it("treats an emptied field as no limit", async () => {
      setup();
      await typeInto(lowField(), "");
      expect(lowField().value).toBe("");
      expect(values()).toEqual(["0", "100"]);
      expect(sent()).toEqual(["price.min=", "price.max=100"]);
    });
  });

  describe("moving a thumb", () => {
    it("changes the field", () => {
      setup();
      fireEvent.change(thumbs()[0] as HTMLInputElement, { target: { value: "40" } });
      expect(lowField().value).toBe("40");
      expect(values()).toEqual(["40", "100"]);
      fireEvent.change(thumbs()[1] as HTMLInputElement, { target: { value: "90" } });
      expect(highField().value).toBe("90");
      expect(sent()).toEqual(["price.min=40", "price.max=90"]);
    });

    it("empties the field again when the thumb is back at the end of the track", () => {
      setup();
      fireEvent.change(thumbs()[0] as HTMLInputElement, { target: { value: "0" } });
      expect(lowField().value).toBe("");
      fireEvent.change(thumbs()[1] as HTMLInputElement, { target: { value: "150" } });
      expect(highField().value).toBe("");
      expect(sent()).toEqual(["price.min=", "price.max="]);
    });

    it("moves with the arrow keys, a currency unit at a time", () => {
      setup();
      const [low] = thumbs();
      fireEvent.keyDown(low as HTMLInputElement, { key: "ArrowRight" });
      expect(lowField().value).toBe("21");
      fireEvent.keyDown(low as HTMLInputElement, { key: "ArrowLeft" });
      fireEvent.keyDown(low as HTMLInputElement, { key: "ArrowLeft" });
      expect(lowField().value).toBe("19");
    });

    it("does not let the two thumbs cross", () => {
      setup({ selected: { min: 99, max: 100 } });
      fireEvent.change(thumbs()[0] as HTMLInputElement, { target: { value: "120" } });
      const [first, second] = values().map(Number) as [number, number];
      expect(first).toBeLessThanOrEqual(second);
    });
  });

  describe("long German and Greek names", () => {
    it.each(longLabels)("%s: wraps the labels, the bounds and the fields", (_locale, strings) => {
      setup({
        minimumLabel: strings.fieldLabel,
        maximumLabel: strings.fieldLabel,
        boundsText: strings.fieldLabel,
      });
      const group = document.querySelector("[data-slot=filter-range]") as HTMLElement;
      for (const element of group.querySelectorAll("*")) {
        expect(String(element.getAttribute("class"))).not.toMatch(CLIPPING_CLASSES);
      }
      expect(within(group).getAllByText(strings.fieldLabel).length).toBeGreaterThan(0);
      expect(
        (group.querySelector("[data-slot=filter-range-bounds]") as HTMLElement).className,
      ).toContain("wrap-anywhere");
      // The two fields share the row, and each may shrink to its half.
      const columns = group.querySelector(".grid") as HTMLElement;
      expect(columns.className).toContain("grid-cols-2");
      for (const cell of columns.children) expect(cell.className).toContain("min-w-0");
    });
  });
});
