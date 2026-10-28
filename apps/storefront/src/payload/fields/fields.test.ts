import type { Field, TextField } from "payload";
import { describe, expect, it } from "vitest";
import { link } from "./link";
import { sectionSettings } from "./section-settings";

const named = (fields: Field[], name: string) =>
  fields.find((field) => "name" in field && field.name === name);

describe("link field", () => {
  it("offers a custom URL only until a collection is named", () => {
    const field = link();
    expect(named(field.fields, "reference")).toBeUndefined();
    expect(named(field.fields, "type")).toMatchObject({ defaultValue: "custom" });
  });

  it("offers an internal reference to the collections given, by default", () => {
    const field = link({ relationTo: ["pages"] });
    expect(named(field.fields, "reference")).toMatchObject({ relationTo: ["pages"] });
    expect(named(field.fields, "type")).toMatchObject({ defaultValue: "reference" });
  });

  it("has a label in each language", () => {
    expect(named(link().fields, "label")).toMatchObject({ localized: true });
    expect(named(link({ label: false }).fields, "label")).toBeUndefined();
  });

  it("refuses a javascript: URL", () => {
    const url = named(link().fields, "url") as TextField;
    const validate = url.validate as unknown as (value: string) => true | string;
    expect(validate("javascript:alert(1)")).not.toBe(true);
    expect(validate("/sale")).toBe(true);
  });
});

describe("sectionSettings", () => {
  it("has SPEC §7.4's five settings, none of them localized", () => {
    const field = sectionSettings();
    const names = field.fields.map((each) => ("name" in each ? each.name : ""));
    expect(names).toEqual(["anchor", "spacing", "surface", "container", "visibility"]);
    expect(field.fields.some((each) => "localized" in each && each.localized)).toBe(false);
    expect(named(field.fields, "surface")).toMatchObject({
      options: ["default", "muted", "inverse"],
    });
  });
});
