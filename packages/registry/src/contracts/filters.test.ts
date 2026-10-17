import { describe, expect, it } from "vitest";
import { FacetGroup } from "./facets";
import { ActiveFilters } from "./listing";

// The filter contracts' own rules for FilterGroup and ActiveFilterChips (T33): an option listed twice,
// a chosen price range that is empty or outside the bounds, a filter listed twice in the chips, and
// the shapes the two components take. `contracts.test.ts` and the fixtures' test parse real data.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const option = (value: string, count = 3, selected = false) => ({
  value,
  label: value,
  count,
  selected,
});

const checkbox = {
  kind: "checkbox",
  id: "size",
  label: "Size",
  options: [option("s"), option("m", 4, true), option("l")],
};

const swatch = {
  kind: "swatch",
  id: "colour",
  label: "Color",
  options: [
    { ...option("black", 8, true), hex: "#111111" },
    { ...option("sky", 2), hex: "#87ceeb" },
  ],
};

const range = {
  kind: "range",
  id: "price",
  label: "Price",
  currencyCode: "EUR",
  min: 0,
  max: 150,
  selected: { min: 20, max: 100 },
};

const toggle = { kind: "toggle", id: "in-stock", label: "In stock", count: 11, selected: true };

describe("FacetGroup", () => {
  it.each([checkbox, swatch, range, toggle])("takes a $kind group", (facet) => {
    expect(issues(FacetGroup, facet)).toEqual([]);
  });

  it("takes a range nobody has touched, and one chosen right up to its bounds", () => {
    const { selected: _selected, ...untouched } = range;
    expect(issues(FacetGroup, untouched)).toEqual([]);
    expect(issues(FacetGroup, { ...range, selected: { min: 0, max: 150 } })).toEqual([]);
    expect(issues(FacetGroup, { ...range, selected: { min: 40, max: 40 } })).toEqual([]);
  });

  it("refuses a checkbox or swatch group that lists a value twice", () => {
    const twice = [option("m"), option("m", 1)];
    expect(issues(FacetGroup, { ...checkbox, options: twice })).toEqual([
      "an option is listed twice",
    ]);
    expect(issues(FacetGroup, { ...swatch, options: twice })).toEqual([
      "an option is listed twice",
    ]);
  });

  it("still refuses a group with no option, and an option with a negative or a fractional count", () => {
    expect(issues(FacetGroup, { ...checkbox, options: [] })).not.toEqual([]);
    expect(issues(FacetGroup, { ...checkbox, options: [option("s", -1)] })).not.toEqual([]);
    expect(issues(FacetGroup, { ...checkbox, options: [option("s", 1.5)] })).not.toEqual([]);
  });

  it("refuses a swatch whose colour is not a six-digit hex", () => {
    const bad = { ...swatch, options: [{ ...option("black"), hex: "black" }] };
    expect(issues(FacetGroup, bad)).not.toEqual([]);
  });

  it("refuses a range whose bounds are the wrong way round", () => {
    expect(issues(FacetGroup, { ...range, min: 200, selected: undefined })).toEqual([
      "min is more than max",
    ]);
  });

  it("refuses a chosen range that is empty or outside the bounds the slider has", () => {
    const message = "the chosen range is empty or outside the bounds";
    expect(issues(FacetGroup, { ...range, selected: { min: 100, max: 20 } })).toEqual([message]);
    expect(issues(FacetGroup, { ...range, selected: { min: -5, max: 20 } })).toEqual([message]);
    expect(issues(FacetGroup, { ...range, selected: { min: 20, max: 151 } })).toEqual([message]);
  });

  it("refuses a currency that is not an upper-case ISO code, and a kind it does not know", () => {
    expect(issues(FacetGroup, { ...range, currencyCode: "eur" })).not.toEqual([]);
    expect(issues(FacetGroup, { ...toggle, kind: "radio" })).not.toEqual([]);
  });
});

const chips = {
  filters: [
    {
      id: "colour:black",
      group: "Color",
      label: "Black",
      removeHref: "/us/store?size=m",
    },
    { id: "in-stock", label: "In stock", removeHref: "/us/store?colour=black" },
  ],
  clearHref: "/us/store",
};

describe("ActiveFilters", () => {
  it("takes filters with a group and filters without one (an on/off filter)", () => {
    expect(issues(ActiveFilters, chips)).toEqual([]);
  });

  it("refuses an empty list: no chosen filter shows no chips at all", () => {
    expect(issues(ActiveFilters, { ...chips, filters: [] })).not.toEqual([]);
  });

  it("refuses a filter listed twice: the list would repeat a key", () => {
    const filters = [...chips.filters, { ...chips.filters[0], label: "Black again" }];
    expect(issues(ActiveFilters, { ...chips, filters })).toEqual(["a filter is listed twice"]);
  });

  it("refuses a link that is not a path or an http(s) URL, and an empty label", () => {
    const [first] = chips.filters;
    expect(
      issues(ActiveFilters, {
        ...chips,
        filters: [{ ...first, removeHref: "javascript:alert(1)" }],
      }),
    ).not.toEqual([]);
    expect(issues(ActiveFilters, { ...chips, clearHref: "//evil.example/store" })).not.toEqual([]);
    expect(issues(ActiveFilters, { ...chips, filters: [{ ...first, label: "" }] })).not.toEqual([]);
    expect(issues(ActiveFilters, { ...chips, filters: [{ ...first, group: "" }] })).not.toEqual([]);
  });
});
