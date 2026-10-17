import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { VariantChoice } from "@shopblok/registry/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import {
  VariantSelector,
  type VariantSelection,
  type VariantSelectorProps,
} from "./variant-selector";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

/** The Heritage Hoodie's page: 4 colours (black, oatmeal, forest, sky) in 6 sizes, XL sold out in
 * every colour and sky also in XS and XXL. */
function choiceOf(locale: Locale): VariantChoice {
  const { options, variants } = commerceFixtures[locale].product;
  return { options, variants };
}

function setup(
  locale: Locale = "en",
  props: Partial<VariantSelectorProps> = {},
  choice: VariantChoice = choiceOf(locale),
) {
  return render(
    <VariantSelector
      {...choice}
      copy={catalogs[locale].molecules.variantSelector}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

/** An accessible name with its spaces made plain and none before a comma ("XL , Unavailable"). */
const plainName = (name: string) => name.replace(/\s+/g, " ").replace(/ ,/g, ",").trim();
const named = (expected: string) => (name: string) => plainName(name) === plainName(expected);
const colourGroup = () => screen.getByRole("radiogroup", { name: /^Color/ });
const sizeGroup = () => screen.getByRole("radiogroup", { name: /^Size/ });
const radio = (name: string) => screen.getByRole("radio", { name: named(name) });
const group = (name: string) => screen.getByRole("radiogroup", { name: named(name) });
const checked = (name: string) => radio(name).getAttribute("aria-checked");
const names = (group: HTMLElement) =>
  within(group)
    .getAllByRole("radio")
    .map((each) => each.textContent?.replace(/\s+/g, " ").trim() ?? "");

describe("VariantSelector", () => {
  describe("structure", () => {
    it("is one named radio group for each option, with a radio for each value", () => {
      setup();
      expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
      expect(within(colourGroup()).getAllByRole("radio")).toHaveLength(4);
      expect(within(sizeGroup()).getAllByRole("radio")).toHaveLength(6);
      expect(radio("Oatmeal")).toBeTruthy();
      expect(radio("M")).toBeTruthy();
    });

    it("names a group by a visible line, which is the option's title until a value is chosen", () => {
      const { container } = setup();
      expect(group("Color")).toBeTruthy();
      expect(group("Size")).toBeTruthy();
      const labels = [...container.querySelectorAll("[data-slot=variant-selector-label]")];
      expect(labels.map((label) => label.textContent)).toEqual(["Color", "Size"]);
    });

    it("says the choice in the group's name: 'Color: Oatmeal'", () => {
      setup("en", { defaultValue: { colour: "colour-oatmeal", size: "size-m" } });
      expect(group("Color: Oatmeal")).toBeTruthy();
      expect(group("Size: M")).toBeTruthy();
    });

    it.each(LOCALES)("writes the group's name as the catalog does, in %s", (locale) => {
      const [colour, size] = choiceOf(locale).options;
      setup(locale, { defaultValue: { colour: "colour-oatmeal", size: "size-l" } });
      const chosen = (option: string, value: string) =>
        formatMessage(
          catalogs[locale].molecules.variantSelector.chosen,
          { option, value },
          htmlLang[locale],
        );
      // The catalog may use a no-break space (French) where the accessible name is compared plain.
      expect(group(chosen(colour!.title, colour!.values[1]!.label))).toBeTruthy();
      expect(group(chosen(size!.title, "L"))).toBeTruthy();
    });

    it("marks the chosen radio with aria-checked, and no radio carries aria-pressed", () => {
      const { container } = setup("en", {
        defaultValue: { colour: "colour-forest", size: "size-m" },
      });
      expect(checked("Forest green")).toBe("true");
      expect(checked("Black")).toBe("false");
      expect(checked("M")).toBe("true");
      // aria-pressed is for buttons: on a radio axe reports aria-allowed-attr.
      expect(container.querySelector("[aria-pressed]")).toBeNull();
      expect(container.querySelectorAll("[role=radio]").length).toBe(10);
    });

    it("draws a Swatch for a colour and a SizePill for a size", () => {
      const { container } = setup();
      expect(colourGroup().querySelectorAll("[data-slot=swatch]")).toHaveLength(4);
      expect(colourGroup().querySelectorAll("[data-slot=size-pill]")).toHaveLength(0);
      expect(sizeGroup().querySelectorAll("[data-slot=size-pill]")).toHaveLength(6);
      expect(container.querySelectorAll("button[role=radio]")).toHaveLength(10);
    });

    it("draws an option of any other kind as pills", () => {
      const choice = choiceOf("en");
      const [, size] = choice.options;
      setup(
        "en",
        {},
        {
          ...choice,
          options: [{ ...size!, id: "size", kind: "other" }],
          variants: choice.variants.map((variant) => ({
            ...variant,
            options: { size: variant.options.size! },
          })),
        },
      );
      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(sizeGroup().querySelectorAll("[data-slot=size-pill]")).toHaveLength(6);
    });

    it("falls back to a pill for a colour with neither a hex nor a picture", () => {
      const choice = choiceOf("en");
      const [colour, size] = choice.options;
      const bare = { ...colour!, values: [{ id: "colour-mystery", label: "Mystery" }] };
      setup(
        "en",
        {},
        {
          options: [bare, size!],
          variants: [
            {
              ...choice.variants[0]!,
              options: { colour: "colour-mystery", size: size!.values[0]!.id },
            },
          ],
        },
      );
      expect(radio("Mystery").getAttribute("data-slot")).toBe("size-pill");
    });

    it("draws a picture swatch for a colour that has one", () => {
      const choice = choiceOf("en");
      const [colour, size] = choice.options;
      const value = {
        id: "colour-linen",
        label: "Linen",
        image: { src: "/media/linen.jpg", alt: "", width: 64, height: 64 },
      };
      setup(
        "en",
        {},
        {
          options: [{ ...colour!, values: [value] }, size!],
          variants: [
            { ...choice.variants[0]!, options: { colour: "colour-linen", size: "size-xs" } },
          ],
        },
      );
      const swatch = radio("Linen");
      expect(swatch.getAttribute("data-slot")).toBe("swatch");
      expect(swatch.querySelector("img")).not.toBeNull();
    });

    it("draws nothing for a product without options", () => {
      const { container } = setup("en", {}, { options: [], variants: choiceOf("en").variants });
      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(container.firstElementChild?.children).toHaveLength(0);
    });

    it("draws one option alone", () => {
      const choice = choiceOf("en");
      const [, size] = choice.options;
      setup(
        "en",
        {},
        {
          options: [size!],
          variants: choice.variants
            .filter((variant) => variant.options.colour === "colour-black")
            .map((variant) => ({ ...variant, options: { size: variant.options.size! } })),
        },
      );
      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(names(sizeGroup())).toEqual(["XS", "S", "M", "L", "XL, Unavailable", "XXL"]);
    });

    it("passes the container's own props on, and merges the class", () => {
      const { container } = setup("en", { id: "options", className: "max-w-sm" });
      const root = container.firstElementChild as HTMLElement;
      expect(root.id).toBe("options");
      expect(root.className).toContain("max-w-sm");
    });
  });

  describe("unavailable values (SPEC §8.4)", () => {
    it("says so in the name of a value no variant can be bought with, and only of those", () => {
      setup();
      // XL is sold out in every colour; the others have a colour they can be bought in.
      expect(names(sizeGroup())).toEqual(["XS", "S", "M", "L", "XL, Unavailable", "XXL"]);
      expect(names(colourGroup())).toEqual(["Black", "Oatmeal", "Forest green", "Sky blue"]);
      expect(radio("XL, Unavailable").getAttribute("data-unavailable")).toBe("");
    });

    it("works out the rest from the other options' choice", () => {
      setup("en", { defaultValue: { colour: "colour-sky" } });
      expect(names(sizeGroup())).toEqual([
        "XS, Unavailable",
        "S",
        "M",
        "L",
        "XL, Unavailable",
        "XXL, Unavailable",
      ]);
      // The colours are judged by the sizes, and no size is chosen.
      expect(names(colourGroup())).toEqual(["Black", "Oatmeal", "Forest green", "Sky blue"]);
    });

    it("makes every value of an option unavailable when the other option's choice leaves none", () => {
      setup("en", { defaultValue: { size: "size-xl" } });
      expect(names(colourGroup())).toEqual([
        "Black, Unavailable",
        "Oatmeal, Unavailable",
        "Forest green, Unavailable",
        "Sky blue, Unavailable",
      ]);
    });

    it("follows the choice as it changes", async () => {
      const user = userEvent.setup();
      setup();
      expect(radio("XS")).toBeTruthy();
      await user.click(radio("Sky blue"));
      expect(names(sizeGroup())).toContain("XS, Unavailable");
      await user.click(radio("Black"));
      expect(names(sizeGroup())).not.toContain("XS, Unavailable");
      expect(names(sizeGroup())).toContain("XL, Unavailable");
    });

    it("still lets the shopper focus and select one, and tells them", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      setup("en", { onValueChange });
      const xl = radio("XL, Unavailable");
      await user.click(xl);
      expect(document.activeElement).toBe(xl);
      expect(onValueChange).toHaveBeenCalledWith(
        { size: "size-xl" },
        { optionId: "size", valueId: "size-xl" },
      );
      // Selected and unavailable: still announced as both.
      const again = radio("XL, Unavailable");
      expect(again.getAttribute("aria-checked")).toBe("true");
      expect(again.getAttribute("data-unavailable")).toBe("");
      expect(again.getAttribute("data-selected")).toBe("");
      expect(group("Size: XL")).toBeTruthy();
    });

    it("can be reached with the arrow keys and chosen with Space", async () => {
      const user = userEvent.setup();
      setup("en", { defaultValue: { size: "size-l" } });
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(radio("L"));
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(radio("XL, Unavailable"));
      expect(checked("XL, Unavailable")).toBe("true");
      await user.keyboard("{ArrowRight}");
      await user.keyboard("{ArrowLeft}");
      await user.keyboard(" ");
      expect(checked("XL, Unavailable")).toBe("true");
    });

    it.each(LOCALES)("says it in the language: %s", (locale) => {
      setup(locale);
      const unavailable = catalogs[locale].molecules.variantSelector.unavailable;
      const xl = within(screen.getAllByRole("radiogroup")[1]!).getAllByRole("radio")[4]!;
      expect(xl.textContent).toContain(unavailable);
    });
  });

  describe("keyboard", () => {
    it("is entered at the first radio when none is checked, and Tab leaves the group", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <VariantSelector
            {...choiceOf("en")}
            copy={catalogs.en.molecules.variantSelector}
            locale="en-US"
          />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
      await user.tab();
      expect(document.activeElement).toBe(radio("Black"));
      // One stop per group: Tab goes on to the next group's first radio, and then out.
      await user.tab();
      expect(document.activeElement).toBe(radio("XS"));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(radio("XS"));
    });

    it("is entered at the checked radio", async () => {
      const user = userEvent.setup();
      setup("en", { defaultValue: { colour: "colour-forest", size: "size-m" } });
      await user.tab();
      expect(document.activeElement).toBe(radio("Forest green"));
      await user.tab();
      expect(document.activeElement).toBe(radio("M"));
    });

    it("moves and selects with ArrowRight and ArrowDown, and back with ArrowLeft and ArrowUp", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      setup("en", { onValueChange });
      await user.tab();
      expect(document.activeElement).toBe(radio("Black"));
      expect(checked("Black")).toBe("false");
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(radio("Oatmeal"));
      expect(checked("Oatmeal")).toBe("true");
      expect(checked("Black")).toBe("false");
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(radio("Forest green"));
      expect(checked("Forest green")).toBe("true");
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toBe(radio("Oatmeal"));
      expect(checked("Oatmeal")).toBe("true");
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(radio("Black"));
      expect(checked("Black")).toBe("true");
      expect(onValueChange).toHaveBeenCalledTimes(4);
      expect(onValueChange).toHaveBeenLastCalledWith(
        { colour: "colour-black" },
        { optionId: "colour", valueId: "colour-black" },
      );
    });

    it("wraps from the last value to the first", async () => {
      const user = userEvent.setup();
      setup("en", { defaultValue: { colour: "colour-sky" } });
      await user.tab();
      expect(document.activeElement).toBe(radio("Sky blue"));
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(radio("Black"));
      expect(checked("Black")).toBe("true");
    });

    it("selects the focused radio with Space", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      setup("en", { onValueChange });
      await user.tab();
      await user.keyboard(" ");
      expect(checked("Black")).toBe("true");
      expect(onValueChange).toHaveBeenCalledWith(
        { colour: "colour-black" },
        { optionId: "colour", valueId: "colour-black" },
      );
      await user.tab();
      await user.keyboard(" ");
      expect(checked("XS")).toBe("true");
      expect(onValueChange).toHaveBeenLastCalledWith(
        { colour: "colour-black", size: "size-xs" },
        { optionId: "size", valueId: "size-xs" },
      );
    });

    it("keeps focus on the radio the shopper chose", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(radio("Forest green"));
      expect(document.activeElement).toBe(radio("Forest green"));
      await user.click(radio("L"));
      expect(document.activeElement).toBe(radio("L"));
      expect(checked("Forest green")).toBe("true");
    });

    it("does not select with Enter, as a radio does not", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      await user.keyboard("{Enter}");
      expect(checked("Black")).toBe("false");
    });
  });

  describe("the choice", () => {
    it("keeps its own state from defaultValue, and changes it", async () => {
      const user = userEvent.setup();
      setup("en", { defaultValue: { colour: "colour-oatmeal" } });
      expect(checked("Oatmeal")).toBe("true");
      await user.click(radio("Black"));
      expect(checked("Black")).toBe("true");
      expect(checked("Oatmeal")).toBe("false");
    });

    it("calls onValueChange with the whole choice and what changed", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      setup("en", { onValueChange, defaultValue: { colour: "colour-oatmeal" } });
      await user.click(radio("M"));
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(
        { colour: "colour-oatmeal", size: "size-m" },
        { optionId: "size", valueId: "size-m" },
      );
    });

    it("does not call it again for the radio that is already chosen", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      setup("en", { onValueChange, defaultValue: { colour: "colour-oatmeal" } });
      await user.click(radio("Oatmeal"));
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("leaves the choice to the page when it is controlled", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      const props = {
        ...choiceOf("en"),
        copy: catalogs.en.molecules.variantSelector,
        locale: "en-US",
        onValueChange,
      };
      const { rerender } = render(
        <VariantSelector {...props} value={{ colour: "colour-black" }} />,
      );
      await user.click(radio("Forest green"));
      expect(onValueChange).toHaveBeenCalledWith(
        { colour: "colour-forest" },
        { optionId: "colour", valueId: "colour-forest" },
      );
      // The page did not accept it: still black.
      expect(checked("Black")).toBe("true");
      expect(checked("Forest green")).toBe("false");
      rerender(<VariantSelector {...props} value={{ colour: "colour-forest", size: "size-s" }} />);
      expect(checked("Forest green")).toBe("true");
      expect(checked("S")).toBe("true");
    });

    it("works in a page that keeps the choice", async () => {
      const user = userEvent.setup();
      function Page() {
        const [value, setValue] = useState<VariantSelection>({});
        return (
          <>
            <output>{JSON.stringify(value)}</output>
            <VariantSelector
              {...choiceOf("en")}
              copy={catalogs.en.molecules.variantSelector}
              locale="en-US"
              value={value}
              onValueChange={setValue}
            />
          </>
        );
      }
      render(<Page />);
      await user.click(radio("Sky blue"));
      await user.click(radio("XXL, Unavailable"));
      expect(JSON.parse(screen.getByRole("status").textContent ?? "")).toEqual({
        colour: "colour-sky",
        size: "size-xxl",
      });
      expect(group("Color: Sky blue")).toBeTruthy();
    });

    it("ignores a choice for a value the product does not have", () => {
      setup("en", { defaultValue: { colour: "colour-mauve" } });
      expect(group("Color")).toBeTruthy();
      for (const each of within(colourGroup()).getAllByRole("radio"))
        expect(each.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("in a form (no JavaScript needed)", () => {
    const fields = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries());

    it("submits each group's chosen value as {name}.{option id}", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <VariantSelector
            {...choiceOf("en")}
            copy={catalogs.en.molecules.variantSelector}
            locale="en-US"
            name="options"
          />
        </form>,
      );
      const form = container.querySelector("form")!;
      expect(fields(form)).toEqual({});
      await user.click(radio("Oatmeal"));
      await user.click(radio("L"));
      expect(fields(form)).toEqual({
        "options.colour": "colour-oatmeal",
        "options.size": "size-l",
      });
      await user.click(radio("XL, Unavailable"));
      expect(fields(form)).toEqual({
        "options.colour": "colour-oatmeal",
        "options.size": "size-xl",
      });
    });

    it("carries the first choice as well", () => {
      const { container } = render(
        <form>
          <VariantSelector
            {...choiceOf("en")}
            copy={catalogs.en.molecules.variantSelector}
            locale="en-US"
            name="options"
            defaultValue={{ colour: "colour-forest", size: "size-m" }}
          />
        </form>,
      );
      expect(fields(container.querySelector("form")!)).toEqual({
        "options.colour": "colour-forest",
        "options.size": "size-m",
      });
    });

    it("has no named field without a name", () => {
      const { container } = setup("en", { defaultValue: { colour: "colour-forest" } });
      expect(container.querySelectorAll("input[name]")).toHaveLength(0);
    });

    it("names the hidden inputs by option, so a value cannot be mistaken for another option's", () => {
      const { container } = render(
        <form>
          <VariantSelector
            {...choiceOf("en")}
            copy={catalogs.en.molecules.variantSelector}
            locale="en-US"
            name="options"
          />
        </form>,
      );
      const named = [...container.querySelectorAll<HTMLInputElement>("input[type=radio]")];
      expect(named.filter((input) => input.name === "options.colour")).toHaveLength(4);
      expect(named.filter((input) => input.name === "options.size")).toHaveLength(6);
      // Hidden from everyone: the radios are the buttons.
      expect(named.every((input) => input.getAttribute("aria-hidden") === "true")).toBe(true);
      expect(named.every((input) => input.tabIndex === -1)).toBe(true);
    });

    it("does not submit the form when a radio is pressed", () => {
      const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <VariantSelector
            {...choiceOf("en")}
            copy={catalogs.en.molecules.variantSelector}
            locale="en-US"
          />
        </form>,
      );
      fireEvent.click(radio("Black"));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("sizes and classes", () => {
    it("makes every control at least 44 × 44 px (D32)", () => {
      setup();
      for (const each of colourGroup().querySelectorAll("[role=radio]"))
        expect(each.className).toContain("size-11");
      for (const each of sizeGroup().querySelectorAll("[role=radio]")) {
        expect(each.className).toContain("min-h-11");
        expect(each.className).toContain("min-w-11");
      }
    });

    it("draws the focus ring at full strength", () => {
      setup();
      for (const each of screen.getAllByRole("radio")) {
        expect(each.className).toContain("focus-visible:ring-ring");
        expect(each.className).not.toContain("ring-ring/");
      }
    });
  });

  describe("long labels", () => {
    /** The long cart line's two options: a name and a value for the colour and for the size. */
    function longLines(locale: "de" | "el") {
      const [colourLine, sizeLine] = commerceFixtures[locale].long.cartLine.options;
      return { colourLine: colourLine!, sizeLine: sizeLine! };
    }

    /** The fixture's long cart-line option names and values, added to the product. */
    function longChoice(locale: "de" | "el"): VariantChoice {
      const { product } = commerceFixtures[locale];
      const { colourLine, sizeLine } = longLines(locale);
      const [colour, size] = product.options;
      const options = [
        {
          ...colour!,
          title: colourLine.option,
          values: [
            ...colour!.values,
            { id: "colour-long", label: colourLine.value, hex: "#a4452c" },
          ],
        },
        {
          ...size!,
          title: sizeLine.option,
          values: [...size!.values, { id: "size-long", label: sizeLine.value }],
        },
      ];
      const available = product.variants.find((variant) => variant.available)!;
      const extra = [
        ...colour!.values.map((each) => ({ colour: each.id, size: "size-long" })),
        ...size!.values.map((each) => ({ colour: "colour-long", size: each.id })),
        { colour: "colour-long", size: "size-long" },
      ].map((combination) => ({
        ...available,
        id: `var_${combination.colour}_${combination.size}`,
        options: combination,
      }));
      return { options, variants: [...product.variants, ...extra] };
    }

    it.each(["de", "el"] as const)("takes a long %s option title and value", (locale) => {
      const { colourLine, sizeLine } = longLines(locale);
      const { container } = setup(
        locale,
        { defaultValue: { size: "size-long" } },
        longChoice(locale),
      );
      // A long value is the radio's name, a long title the group's.
      expect(radio(sizeLine.value)).toBeTruthy();
      expect(radio(colourLine.value)).toBeTruthy();
      expect(group(`${sizeLine.option}: ${sizeLine.value}`)).toBeTruthy();
      expect(group(colourLine.option)).toBeTruthy();
      // It wraps instead of being cut, and cannot push the page wider than its container.
      const pill = radio(sizeLine.value);
      expect(pill.className).toContain("wrap-anywhere");
      expect(pill.className).toContain("max-w-full");
      // A pill that wraps onto two lines is a rounded rectangle, not a stadium that squeezes the text.
      expect(pill.className).toContain("rounded-3xl");
      expect(pill.className).not.toContain("rounded-full");
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      for (const label of container.querySelectorAll("[data-slot=variant-selector-label]"))
        expect(label.className).toContain("wrap-anywhere");
      expect(container.querySelector("[data-slot=variant-selector]")?.className).toContain(
        "min-w-0",
      );
    });

    it.each(["de", "el"] as const)("keeps a long unavailable value's note in %s", (locale) => {
      const { sizeLine } = longLines(locale);
      const choice = longChoice(locale);
      // Nothing can be bought in the long size.
      choice.variants = choice.variants.map((variant) =>
        variant.options.size === "size-long" ? { ...variant, available: false } : variant,
      );
      setup(locale, {}, choice);
      const unavailable = catalogs[locale].molecules.variantSelector.unavailable;
      expect(radio(`${sizeLine.value}, ${unavailable}`)).toBeTruthy();
    });
  });
});
