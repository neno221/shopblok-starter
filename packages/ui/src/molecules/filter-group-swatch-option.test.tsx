import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { FilterSwatchOption, type FilterSwatchOptionProps } from "./filter-group-swatch-option";

const base: FilterSwatchOptionProps = {
  name: "colour",
  value: "black",
  label: "Black",
  colour: "#111111",
  defaultChecked: false,
  disabled: false,
  count: "8",
  countLabel: "8 products",
};

function setup(extra: Partial<FilterSwatchOptionProps> = {}) {
  return render(
    <form>
      <FilterSwatchOption {...base} {...extra} />
    </form>,
  );
}

const box = () => screen.getByRole("checkbox", { name: /^Black\s*, 8 products$/ });
const sent = () =>
  [...new FormData(document.querySelector("form") as HTMLFormElement).entries()].map(
    ([name, value]) => `${name}=${String(value)}`,
  );

describe("FilterSwatchOption", () => {
  it("is a swatch button that is a checkbox, with aria-checked and no aria-pressed", () => {
    setup();
    expect(box().tagName).toBe("BUTTON");
    expect(box().getAttribute("data-slot")).toBe("swatch");
    expect(box().getAttribute("aria-checked")).toBe("false");
    expect(box().hasAttribute("aria-pressed")).toBe(false);
    expect(box().getAttribute("type")).toBe("button");
  });

  it("is named by the words beside it and their count, not by the disc's own text", () => {
    setup();
    expect(box().getAttribute("aria-labelledby")).toBe(
      document.querySelector("label")?.getAttribute("id"),
    );
    const label = document.querySelector("label") as HTMLElement;
    expect(label.getAttribute("for")).toBe(box().id);
    // The count is drawn as "8" and read as "8 products", once each.
    expect(label.querySelector("[aria-hidden=true]")?.textContent).toBe("8");
    expect(label.textContent).toContain(", 8 products");
  });

  it("sends its value under the facet's id when it is checked, and nothing when it is not", () => {
    const { unmount } = setup({ defaultChecked: true });
    expect(box().getAttribute("aria-checked")).toBe("true");
    expect(sent()).toEqual(["colour=black"]);
    unmount();
    setup();
    expect(sent()).toEqual([]);
  });

  it("is checked and unchecked by a click on the disc or on the words beside it", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(box());
    expect(sent()).toEqual(["colour=black"]);
    await user.click(screen.getByText("Black", { selector: "label span" }));
    expect(sent()).toEqual([]);
    await user.click(screen.getByText("Black", { selector: "label span" }));
    expect(box().getAttribute("aria-checked")).toBe("true");
  });

  it("is checked with Space, and Tab reaches it", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(document.activeElement).toBe(box());
    await user.keyboard(" ");
    expect(box().getAttribute("aria-checked")).toBe("true");
    expect(box().className).toContain("focus-visible:ring-ring");
    expect(box().className).not.toMatch(/ring-ring\//);
  });

  it("gives a checked swatch a thick edge in the primary colour", () => {
    setup({ defaultChecked: true });
    expect(box().className).toContain("data-checked:border-2");
    expect(box().className).toContain("data-checked:border-primary");
    expect(box().hasAttribute("data-checked")).toBe(true);
  });

  it("cannot be used when disabled, and the words beside it are muted", async () => {
    const user = userEvent.setup();
    setup({ disabled: true });
    await user.click(box());
    await user.click(screen.getByText("Black", { selector: "label span" }));
    expect(box().getAttribute("aria-checked")).toBe("false");
    expect(sent()).toEqual([]);
    expect(document.querySelector("label")?.className).toContain("text-muted-foreground");
    expect(document.querySelector("label")?.className).toContain("cursor-not-allowed");
  });

  it("keeps a disabled but checked swatch out of the query, as a browser does", () => {
    setup({ disabled: true, defaultChecked: true });
    expect(sent()).toEqual([]);
  });

  it("draws a picture when it is given one", () => {
    setup({ colour: undefined, image: "https://example.com/oat.jpg" });
    expect(box().querySelector("img")).toBeTruthy();
  });

  it("is a 44 px row, and lets a long name wrap", () => {
    setup();
    const row = document.querySelector("[data-slot=filter-swatch-option]") as HTMLElement;
    expect(row.className).toContain("min-h-11");
    expect(document.querySelector("label")?.className).toContain("min-h-11");
    expect(box().className).toContain("size-11");
  });

  it.each(longLabels)(
    "%s: wraps a long name and keeps every class from cutting it",
    (_l, strings) => {
      setup({ label: strings.fieldLabel });
      expect(screen.getByText(strings.fieldLabel, { selector: "label span" }).className).toContain(
        "wrap-anywhere",
      );
      for (const element of document.querySelectorAll("*")) {
        expect(String(element.getAttribute("class"))).not.toMatch(CLIPPING_CLASSES);
      }
    },
  );
});
