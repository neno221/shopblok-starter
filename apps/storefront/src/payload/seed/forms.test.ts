import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";
import { formFields, newsletterField, type StoredFormField } from "../../lib/forms/fields";
import { seedForms } from "./forms";

// The seeded forms (T67): created once in four languages on the same rows, then the editors' own.

function fakePayload(existing: string[] = []) {
  let ids = 0;
  const find = vi.fn(async ({ where }: { where: { seedKey: { equals: string } } }) => ({
    docs: existing.includes(where.seedKey.equals) ? [{ id: 99 }] : [],
  }));
  const create = vi.fn(async ({ data }: { data: { fields: Record<string, unknown>[] } }) => ({
    id: ++ids,
    fields: data.fields.map((row, index) => ({
      ...row,
      id: `row-${index}`,
      ...(Array.isArray(row["options"])
        ? {
            options: (row["options"] as object[]).map((option, at) => ({
              ...option,
              id: `opt-${at}`,
            })),
          }
        : {}),
    })),
  }));
  const update = vi.fn(async (_call: { locale: string; data: Record<string, unknown> }) => ({}));
  return { payload: { find, create, update } as unknown as Payload, find, create, update };
}

describe("seedForms (T67)", () => {
  it("creates Newsletter and Contact in English, then labels the same rows in each other language", async () => {
    const { payload, create, update } = fakePayload();
    expect(await seedForms(payload)).toEqual({ created: 2, updated: 0, unchanged: 0, kept: [] });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      collection: "forms",
      locale: "en",
      data: { title: "Newsletter", seedKey: "newsletter" },
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
    expect(update.mock.calls.map(([call]) => call.locale)).toEqual([
      "el",
      "de",
      "fr",
      "el",
      "de",
      "fr",
    ]);
    const greek = update.mock.calls[3]?.[0] as unknown as {
      data: { fields: Record<string, unknown>[]; submitButtonLabel: string };
    };
    expect(greek.data.submitButtonLabel).toBe("Αποστολή μηνύματος");
    expect(greek.data.fields[0]).toMatchObject({
      id: "row-0",
      name: "name",
      label: "Το όνομά σας",
    });
    expect(greek.data.fields[2]?.["options"]).toEqual([
      { id: "opt-0", label: "Μια παραγγελία", value: "order" },
      { id: "opt-1", label: "Επιστροφές και επιδιορθώσεις", value: "returns" },
      { id: "opt-2", label: "Κάτι άλλο", value: "other" },
    ]);
  });

  it("leaves a form that is there alone, whatever an editor made of it", async () => {
    const { payload, create, update } = fakePayload(["newsletter", "contact"]);
    expect(await seedForms(payload)).toEqual({ created: 0, updated: 0, unchanged: 2, kept: [] });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("seeds a newsletter the footer can take, and a contact form the section draws whole", async () => {
    const { payload, create } = fakePayload();
    await seedForms(payload);
    const [newsletter, contact] = create.mock.calls.map(([call]) =>
      formFields(call.data.fields as StoredFormField[]),
    );
    expect(newsletterField(newsletter ?? [])).toBe("email");
    expect(contact?.map((field) => field.kind)).toEqual([
      "text",
      "email",
      "select",
      "text",
      "textarea",
      "message",
      "checkbox",
    ]);
  });
});
