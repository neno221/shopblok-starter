import type { Field, GroupField, TextField } from "payload";
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

  /** The `url` field's validate, called as Payload calls it (the parts of the arguments it reads). */
  const validateUrl = (field: GroupField, value: string | null, required: boolean) => {
    const url = named(field.fields, "url") as TextField;
    const validate = url.validate as unknown as (value: unknown, args: unknown) => true | string;
    return validate(value, { required, req: { payload: { config: {} }, t: (key: string) => key } });
  };

  it("refuses a javascript: URL", () => {
    expect(validateUrl(link(), "javascript:alert(1)", true)).not.toBe(true);
    expect(validateUrl(link(), "/sale", true)).toBe(true);
    expect(validateUrl(link(), "https://example.com", true)).toBe(true);
  });

  it("refuses an empty URL when the link is required, and takes none when it is not", () => {
    expect(validateUrl(link(), "", true)).not.toBe(true);
    expect(validateUrl(link(), null, true)).not.toBe(true);
    expect(validateUrl(link({ required: false }), "", false)).toBe(true);
    expect(validateUrl(link({ required: false }), null, false)).toBe(true);
  });

  it("hides the URL of a reference link, so Payload does not validate it", () => {
    const url = named(link({ relationTo: ["pages"] }).fields, "url") as TextField;
    const condition = url.admin?.condition as (data: unknown, sibling: unknown) => boolean;
    expect(condition({}, { type: "reference" })).toBe(false);
    expect(condition({}, { type: "custom" })).toBe(true);
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
