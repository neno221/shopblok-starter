import type { Field, GroupField, TextField } from "payload";
import { describe, expect, it, vi } from "vitest";
import { formReference, NOT_A_NEWSLETTER, newsletterForm } from "./form-reference";
import { hideDeletedInMedusa, link } from "./link";
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

describe("hideDeletedInMedusa (D85)", () => {
  it("hides a catalog document Medusa deleted from the pickers, and filters nothing else", () => {
    for (const relationTo of ["products", "categories", "collections"]) {
      expect(hideDeletedInMedusa({ relationTo } as never)).toEqual({
        deletedInMedusa: { not_equals: true },
      });
    }
    expect(hideDeletedInMedusa({ relationTo: "pages" } as never)).toBe(true);
  });

  it("lets through the document the link already holds, so a save is not refused for it", () => {
    const holding = (relationTo: string, value: unknown) =>
      hideDeletedInMedusa({
        relationTo: "products",
        siblingData: { type: "reference", reference: { relationTo, value } },
      } as never);
    const shown = { deletedInMedusa: { not_equals: true } };
    expect(holding("products", 7)).toEqual({ or: [shown, { id: { equals: 7 } }] });
    expect(holding("products", { id: 7, handle: "gone" })).toEqual({
      or: [shown, { id: { equals: 7 } }],
    });
    // A reference to another collection lets nothing more through here.
    expect(holding("categories", 7)).toEqual(shown);
    expect(holding("products", null)).toEqual(shown);
  });

  it("is on the link field's reference", () => {
    const group = link({ relationTo: ["products"] });
    const reference = group.fields.find((field) => "name" in field && field.name === "reference");
    expect(reference).toMatchObject({ filterOptions: hideDeletedInMedusa });
  });
});

describe("formReference (T67, D81)", () => {
  const forms: Record<number, unknown[]> = {
    1: [{ blockType: "email", name: "email", label: "Email", required: true }],
    2: [
      { blockType: "text", name: "name", label: "Name" },
      { blockType: "email", name: "email", label: "Email" },
    ],
  };
  const findByID = vi.fn(async ({ id }: { id: number }) => {
    if (forms[id] === undefined) throw new Error("not found");
    return { id, fields: forms[id] };
  });
  const options = {
    event: "submit",
    relationTo: "forms",
    required: false,
    req: {
      payload: { collections: { forms: {} }, db: { defaultIDType: "number" }, findByID },
      t: (key: string) => key,
    },
  } as unknown as Parameters<typeof newsletterForm>[1];

  it("takes a form whose only field is an email field as a newsletter's, and no other", async () => {
    expect(await newsletterForm(1, options)).toBe(true);
    expect(await newsletterForm(2, options)).toBe(NOT_A_NEWSLETTER);
    expect(await newsletterForm(9, options)).toMatch(/no longer exists/);
    expect(await newsletterForm(null as never, options)).toBe(true);
  });

  it("checks a newsletter's form only, and is required unless the caller says not", () => {
    expect(formReference({ newsletter: true, required: false })).toMatchObject({
      relationTo: "forms",
      required: false,
      validate: newsletterForm,
    });
    expect(formReference()).toMatchObject({ relationTo: "forms", required: true, maxDepth: 1 });
    expect(formReference()).not.toHaveProperty("validate");
  });
});
