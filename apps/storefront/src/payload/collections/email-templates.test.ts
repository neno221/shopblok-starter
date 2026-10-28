import emailCopy from "@shopblok/fixtures/email/templates.json";
import type { AccessArgs, Field, FieldAccess, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";
import { emailTemplatesSeed } from "../seed/email-templates";
import { EMAIL_TYPES, EMAIL_VARIABLES, EmailTemplates } from "./email-templates";

// T70 (D84): who may read and change the e-mails' copy, and the seed of M3's three e-mails in the
// seeded markets' four languages. The backend's test reads the same fixture for its built-in
// English and its variables.

const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const sync = { collection: "integrations", id: 1, role: "medusa-sync" };
const req = (user: unknown) => ({ user }) as PayloadRequest;
const as = (user: unknown) => ({ req: req(user) }) as AccessArgs;

const named = (name: string) =>
  EmailTemplates.fields.find((field: Field) => "name" in field && field.name === name);

describe("email-templates access", () => {
  const access = EmailTemplates.access!;

  it("is read by staff and the Medusa sync, not by visitors", () => {
    expect(access.read!(as(editor))).toBe(true);
    expect(access.read!(as(sync))).toBe(true);
    expect(access.read!(as(null))).toBe(false);
  });

  it("is edited by staff; only admins create or delete, and the sync writes nothing", () => {
    expect(access.update!(as(editor))).toBe(true);
    expect(access.update!(as(sync))).toBe(false);
    expect(access.create!(as(editor))).toBe(false);
    expect(access.create!(as(admin))).toBe(true);
    expect(access.delete!(as(editor))).toBe(false);
    expect(access.create!(as(sync))).toBe(false);
  });

  it("keeps a document's type once it exists", () => {
    const type = named("type");
    const update = type && "access" in type ? type.access?.update : undefined;
    expect(update?.({ req: req(admin) } as Parameters<FieldAccess>[0])).toBe(false);
  });
});

describe("the e-mail templates seed", () => {
  it("has one document per type, in the four seeded languages, with every required field", async () => {
    const documents = await emailTemplatesSeed.documents(undefined as never);
    expect(documents.map((document) => document.shared?.["type"]?.value)).toEqual([...EMAIL_TYPES]);
    for (const document of documents) {
      for (const field of ["subject", "heading", "body", "cta"]) {
        expect(Object.keys(document.localized[field] ?? {}).sort()).toEqual([
          "de",
          "el",
          "en",
          "fr",
        ]);
      }
    }
  });

  it("writes the body as Lexical paragraphs", async () => {
    const [verify] = await emailTemplatesSeed.documents(undefined as never);
    const body = verify?.localized["body"]?.["el"]?.value as {
      root: { children: { type: string; children: { text: string }[] }[] };
    };
    expect(body.root.children.map((block) => block.type)).toEqual(["paragraph", "paragraph"]);
    expect(body.root.children[1]?.children[0]?.text).toBe(
      emailCopy.templates["verify-email"].el.body[1],
    );
  });

  it("uses only each type's variables, which the collection's description lists", () => {
    expect(EMAIL_VARIABLES).toEqual(emailCopy.variables);
    for (const type of EMAIL_TYPES) {
      for (const name of EMAIL_VARIABLES[type]) {
        expect(EmailTemplates.admin?.description).toContain(`{{${name}}}`);
      }
    }
  });
});
