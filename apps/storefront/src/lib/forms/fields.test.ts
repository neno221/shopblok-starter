import { describe, expect, it } from "vitest";
import {
  answersSchema,
  checkFieldNames,
  formFields,
  HONEYPOT_FIELD,
  newsletterField,
  submissionData,
  type StoredFormField,
} from "./fields";

// D81's forms between the plugin and the shop (T67): the fields as the section draws them, the
// admin's check of their names, and the answers' schema the server action parses a post with.

const contact: StoredFormField[] = [
  { blockType: "text", name: "name", label: "Name", required: true, width: 50 },
  { blockType: "email", name: "email", label: "Email", required: true, width: 50 },
  {
    blockType: "select",
    name: "topic",
    label: "Topic",
    options: [
      { label: "An order", value: "order" },
      { label: "", value: "other" },
      { label: "No value", value: " " },
    ],
  },
  { blockType: "textarea", name: "message", label: "Message", required: true, width: 100 },
  { blockType: "message", id: "note", message: { root: {} } },
  { blockType: "checkbox", name: "consent", label: "I agree", required: true, defaultValue: true },
];

describe("formFields: a form's fields as the section draws them (T67)", () => {
  it("keeps the editor's order, halves at 50% or less, and each kind's own props", () => {
    expect(formFields(contact)).toEqual([
      { kind: "text", name: "name", label: "Name", required: true, width: "half" },
      { kind: "email", name: "email", label: "Email", required: true, width: "half" },
      {
        kind: "select",
        name: "topic",
        label: "Topic",
        required: false,
        width: "full",
        options: [
          { label: "An order", value: "order" },
          { label: "other", value: "other" },
        ],
      },
      { kind: "textarea", name: "message", label: "Message", required: true, width: "full" },
      { kind: "message", id: "note" },
      {
        kind: "checkbox",
        name: "consent",
        label: "I agree",
        required: true,
        width: "full",
        defaultChecked: true,
      },
    ]);
  });

  it("leaves out the spam trap's name, a second field of one name, a bad name and other kinds", () => {
    const fields = formFields([
      { blockType: "text", name: HONEYPOT_FIELD, label: "Website" },
      { blockType: "text", name: "name", label: "Name" },
      { blockType: "email", name: "name", label: "Again" },
      { blockType: "text", name: "1st", label: "Bad" },
      { blockType: "number", name: "count", label: "Count" },
      { blockType: "message", id: "empty", message: null },
    ]);
    expect(fields.map((field) => ("name" in field ? field.name : field.id))).toEqual(["name"]);
  });

  it("names a field by its name when the label is empty", () => {
    expect(formFields([{ blockType: "text", name: "city", label: " " }])[0]).toMatchObject({
      label: "city",
    });
  });
});

describe("checkFieldNames: the admin's check on save (T67)", () => {
  it("passes names of letters, digits, - and _ from a letter, each once", () => {
    expect(checkFieldNames(contact)).toBe(true);
    expect(checkFieldNames(undefined)).toBe(true);
  });

  it("refuses a bad name, the spam trap's and a name used twice", () => {
    expect(checkFieldNames([{ blockType: "text", name: "first name" }])).toMatch(/cannot be/);
    expect(checkFieldNames([{ blockType: "text", name: HONEYPOT_FIELD }])).toMatch(/spam trap/);
    expect(
      checkFieldNames([
        { blockType: "text", name: "a" },
        { blockType: "email", name: "a" },
      ]),
    ).toMatch(/used twice/);
  });
});

describe("answersSchema: the post's check (D81)", () => {
  const schema = answersSchema(formFields(contact));
  const valid = { name: " Ann ", email: "ann@example.com", message: "Hello", consent: "on" };

  it("takes a valid post, trimmed, and drops what is not a field (the spam trap, Next's own)", () => {
    expect(schema.parse({ ...valid, [HONEYPOT_FIELD]: "", $ACTION_ID_x: "", extra: "1" })).toEqual({
      name: "Ann",
      email: "ann@example.com",
      message: "Hello",
      consent: "on",
    });
  });

  it("lets an optional field be blank, and refuses a missing required one or an unticked box", () => {
    expect(schema.safeParse({ ...valid, topic: "  " }).success).toBe(true);
    const result = schema.safeParse({ email: "ann@example.com", name: "", message: "Hi" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["consent", "name"]);
    // Each as missing, the kind `toFieldErrors` reads as `required`.
    expect(result.error?.issues.map((issue) => issue.code)).toEqual([
      "invalid_type",
      "invalid_type",
    ]);
  });

  it("refuses an email's wrong shape, an option not offered and a text over its limit", () => {
    for (const bad of [
      { email: "ann@" },
      { topic: "returns" },
      { name: "x".repeat(201) },
      { message: "x".repeat(4001) },
      { email: `${"a".repeat(250)}@example.com` },
      { consent: "yes" },
    ])
      expect(schema.safeParse({ ...valid, ...bad }).success, JSON.stringify(bad)).toBe(false);
  });
});

describe("submissionData and newsletterField (T67)", () => {
  it("stores every field, a box as true or false, a blank one as empty", () => {
    expect(submissionData(formFields(contact), { name: "Ann", email: "a@b.co" })).toEqual([
      { field: "name", value: "Ann" },
      { field: "email", value: "a@b.co" },
      { field: "topic", value: "" },
      { field: "message", value: "" },
      { field: "consent", value: "false" },
    ]);
  });

  it("finds the newsletter's one email field, and nothing in any other form", () => {
    const signup = formFields([
      { blockType: "message", id: "m", message: {} },
      { blockType: "email", name: "address", label: "Email", required: true },
    ]);
    expect(newsletterField(signup)).toBe("address");
    expect(newsletterField(formFields(contact))).toBeUndefined();
    expect(newsletterField(formFields([{ blockType: "text", name: "email" }]))).toBeUndefined();
  });
});
