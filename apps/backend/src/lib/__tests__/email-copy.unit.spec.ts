import { readFileSync } from "node:fs";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import {
  BUILT_IN,
  createEmailCopy,
  EMAIL_TYPES,
  EMAIL_VARIABLES,
  fillVariables,
  languageFrom,
  lexicalToText,
  type StoredTemplate,
  type TemplateSource,
} from "../email-copy";
import { sendStorefrontLink } from "../storefront-mail";

/**
 * T70 (D84): the e-mails' copy from Payload, the built-in English when Payload does not answer,
 * the variables and the Lexical walker. The shared fixture is what the storefront's seed writes.
 */

type FixtureCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: string[];
  cta: string;
};
const fixture = JSON.parse(
  readFileSync(require.resolve("@shopblok/fixtures/email/templates.json"), "utf8"),
) as {
  variables: Record<string, string[]>;
  templates: Record<string, Record<string, FixtureCopy>>;
};

const paragraph = (...children: unknown[]) => ({ type: "paragraph", children });
const text = (value: string) => ({ type: "text", text: value });
const lexical = (...children: unknown[]) => ({ root: { type: "root", children } });

/** Greek copy as Payload answers it for `locale=el`. */
const greek: StoredTemplate = {
  subject: "Επιβεβαιώστε τη διεύθυνση e-mail σας",
  preheader: "Ένα κλικ.",
  heading: "Επιβεβαιώστε τη διεύθυνση",
  body: lexical(paragraph(text("Η διεύθυνση {{email}} είναι δική σας;"))),
  cta: "Επιβεβαίωση",
};

describe("the shared copy (fixture)", () => {
  it("has the built-in English the storefront seeds, and the same variables per type", () => {
    expect(Object.keys(fixture.templates).sort()).toEqual([...EMAIL_TYPES].sort());
    for (const type of EMAIL_TYPES) {
      expect(BUILT_IN[type]).toEqual(fixture.templates[type]?.["en"]);
      expect(EMAIL_VARIABLES[type]).toEqual(fixture.variables[type]);
    }
  });

  it("uses only each type's variables, in every language", () => {
    for (const type of EMAIL_TYPES) {
      for (const copy of Object.values(fixture.templates[type] ?? {})) {
        const all = [copy.subject, copy.preheader, copy.heading, ...copy.body, copy.cta].join(" ");
        for (const [, name] of all.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
          expect(EMAIL_VARIABLES[type]).toContain(name);
        }
      }
    }
  });
});

describe("lexicalToText", () => {
  it("writes paragraphs and headings as blocks, lists as lines, links with their URL", () => {
    const document = lexical(
      { type: "heading", tag: "h2", children: [text("Hello")] },
      paragraph(
        text("Open "),
        { type: "link", fields: { url: "https://example.com/a" }, children: [text("this page")] },
        { type: "linebreak" },
        text("today."),
      ),
      {
        type: "list",
        listType: "bullet",
        children: [
          { type: "listitem", children: [text("one")] },
          {
            type: "listitem",
            children: [
              {
                type: "list",
                listType: "number",
                children: [{ type: "listitem", children: [text("a")] }],
              },
            ],
          },
          { type: "listitem", children: [text("two")] },
        ],
      },
      paragraph(),
    );
    expect(lexicalToText(document)).toBe(
      "Hello\n\nOpen this page (https://example.com/a)\ntoday.\n\n- one\n  1. a\n- two",
    );
  });

  it("gives an empty text for anything that is not Lexical", () => {
    expect(lexicalToText(null)).toBe("");
    expect(lexicalToText("text")).toBe("");
    expect(lexicalToText({ root: null })).toBe("");
  });
});

describe("fillVariables", () => {
  it("fills the type's variables and leaves any other as text", () => {
    expect(
      fillVariables("Hi {{ email }}, {{orderNumber}} {{unknown}}", ["email"], {
        email: "anna@example.com",
        orderNumber: "1042",
      }),
    ).toBe("Hi anna@example.com, {{orderNumber}} {{unknown}}");
  });

  it("escapes markup in a value, and does not fill a value's own braces", () => {
    expect(
      fillVariables("To {{email}}", ["email", "code"], {
        email: '<b>"x"</b> & {{code}}',
        code: "secret",
      }),
    ).toBe("To &#60;b&#62;&#34;x&#34;&#60;/b&#62; &#38; {{code}}");
  });
});

describe("languageFrom", () => {
  it("takes a language code's shape from the metadata, else English", () => {
    expect(languageFrom({ market: "", language: "el" })).toBe("el");
    for (const metadata of [
      undefined,
      null,
      {},
      { language: "EL" },
      { language: "el&x=1" },
      { language: 3 },
    ]) {
      expect(languageFrom(metadata)).toBe("en");
    }
  });
});

describe("createEmailCopy", () => {
  const values = { email: "anna@example.com", code: "c0de" };

  it("uses Payload's copy in the language asked for, with the variables filled", async () => {
    const source = jest.fn<ReturnType<TemplateSource>, Parameters<TemplateSource>>(
      async () => greek,
    );
    const copy = await createEmailCopy({ source }).copyFor("verify-email", "el", values);
    expect(source).toHaveBeenCalledWith("verify-email", "el", 2_000);
    expect(copy).toEqual({
      subject: "Επιβεβαιώστε τη διεύθυνση e-mail σας",
      preheader: "Ένα κλικ.",
      heading: "Επιβεβαιώστε τη διεύθυνση",
      text: "Η διεύθυνση anna@example.com είναι δική σας;",
      cta: "Επιβεβαίωση",
      language: "el",
      source: "payload",
    });
  });

  it("keeps an answer 5 minutes per type and language, then asks again", async () => {
    let time = 0;
    const source = jest.fn<ReturnType<TemplateSource>, Parameters<TemplateSource>>(
      async () => greek,
    );
    const reader = createEmailCopy({ source, now: () => time });
    await reader.copyFor("verify-email", "el", values);
    time = 5 * 60_000 - 1;
    await reader.copyFor("verify-email", "el", values);
    expect(source).toHaveBeenCalledTimes(1);
    await reader.copyFor("verify-email", "de", values);
    expect(source).toHaveBeenCalledTimes(2);
    time = 5 * 60_000;
    await reader.copyFor("verify-email", "el", values);
    expect(source).toHaveBeenCalledTimes(3);
  });

  it("sends the built-in English when Payload fails, and asks again next time", async () => {
    const warn = jest.fn();
    const source = jest.fn<ReturnType<TemplateSource>, Parameters<TemplateSource>>(async () => {
      throw new Error("GET /email-templates: Payload did not answer (fetch failed)");
    });
    const reader = createEmailCopy({ source, warn });
    const copy = await reader.copyFor("password-reset", "el", values);
    expect(copy).toMatchObject({
      subject: "Reset your password",
      language: "en",
      source: "built-in",
    });
    expect(copy.text).toContain("anna@example.com");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("goes out in English"));
    await reader.copyFor("password-reset", "el", values);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it("does not wait for a Payload that never answers past its time-out", async () => {
    const source: TemplateSource = () => new Promise(() => undefined);
    const started = Date.now();
    const copy = await createEmailCopy({ source, timeoutMs: 100 }).copyFor("order-transfer", "de", {
      email: "anna@example.com",
      orderNumber: "1042",
    });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(copy).toMatchObject({
      subject: "Order 1042: confirm the move to an account",
      source: "built-in",
    });
  }, 2_000);

  it("fills an empty field with the built-in English, and English when Payload has no template", async () => {
    const partial = createEmailCopy({ source: async () => ({ ...greek, cta: "", body: null }) });
    const copy = await partial.copyFor("verify-email", "el", values);
    expect(copy.cta).toBe("Confirm my address");
    expect(copy.text).toBe(
      "Hello,\n\nPlease confirm that anna@example.com is your address by opening the link below. The link works once.",
    );
    const none = await createEmailCopy({ source: async () => null }).copyFor(
      "verify-email",
      "el",
      values,
    );
    expect(none).toMatchObject({ subject: "Confirm your e-mail address", language: "en" });
  });
});

describe("sendStorefrontLink with Payload down (T70)", () => {
  it("still sends the link, with the English copy", async () => {
    const createNotifications = jest.fn();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const container = {
      hasRegistration: () => false,
      resolve: (key: string) =>
        key === ContainerRegistrationKeys.CONFIG_MODULE
          ? { admin: { storefrontUrl: "https://shop.example" } }
          : key === Modules.NOTIFICATION
            ? { createNotifications }
            : logger,
    };
    await sendStorefrontLink(container as never, {
      to: "anna@example.com",
      template: "customer-password-reset",
      type: "password-reset",
      metadata: { market: "/us", language: "en" },
      path: "/reset-password",
      query: { token: "t" },
      idempotencyKey: "reset-1",
    });
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "anna@example.com",
        template: "customer-password-reset",
        data: expect.objectContaining({
          url: "https://shop.example/us/reset-password?token=t",
          subject: "Reset your password",
          heading: "Reset your password",
          language: "en",
        }),
      }),
    );
  });
});
