import templates from "@shopblok/fixtures/email/templates.json";
import { describe, expect, it } from "vitest";
import { EMAIL_TYPES, EMAIL_VARIABLES, paragraphs, render, type EmailInput } from ".";

const copy = (body: string[]) => ({
  subject: "Order {{orderNumber}} for {{email}}",
  preheader: "For {{email}}",
  heading: "Hello {{email}}",
  body: paragraphs(body),
  cta: "Open {{orderNumber}}",
});

const input = (overrides: Partial<EmailInput> = {}): EmailInput => ({
  copy: copy(["Placed with {{email}}.", "Keep {{unknown}} as written."]),
  variables: { email: "o'brien@example.com", orderNumber: "37" },
  url: "https://shop.example/us/account/orders/transfer?token=abc&x=1",
  language: "en",
  shop: { name: "Shopblok" },
  ...overrides,
});

describe("render (D121)", () => {
  it("returns the subject, an HTML document and a text part, with the variables filled in", async () => {
    const email = await render("order-transfer", input());
    expect(email.subject).toBe("Order 37 for o'brien@example.com");
    expect(email.html.startsWith("<!DOCTYPE html PUBLIC")).toBe(true);
    expect(email.html).toContain('<html lang="en" dir="ltr">');
    expect(email.html).toContain("<title>Order 37 for o&#x27;brien@example.com</title>");
    expect(email.html).toContain("Hello o&#x27;brien@example.com");
    expect(email.html).toContain("Placed with o&#x27;brien@example.com.");
    // The link is the notification's: `&` is an attribute's `&amp;`, once.
    expect(email.html).toContain(
      'href="https://shop.example/us/account/orders/transfer?token=abc&amp;x=1"',
    );
    expect(email.text).toBe(
      [
        "Hello o'brien@example.com",
        "Placed with o'brien@example.com.\n\nKeep {{unknown}} as written.",
        "Open 37:\nhttps://shop.example/us/account/orders/transfer?token=abc&x=1",
        "Shopblok",
      ].join("\n\n"),
    );
  });

  it("escapes a value with ', & and <script> once in the HTML, and keeps it as written in the text and the subject", async () => {
    const value = `o'brien&co<script>alert(1)</script>@example.com`;
    const email = await render(
      "order-transfer",
      input({ variables: { email: value, orderNumber: "37" } }),
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain(
      "Placed with o&#x27;brien&amp;co&lt;script&gt;alert(1)&lt;/script&gt;@example.com.",
    );
    // Once: no `&amp;amp;` or `&amp;#x27;`.
    expect(email.html).not.toMatch(/&amp;(amp|#x27|lt|gt);/);
    expect(email.subject).toBe(`Order 37 for ${value}`);
    expect(email.text).toContain(`Placed with ${value}.`);
  });

  it("does not fill a value's own braces, nor a variable the type does not take", async () => {
    const email = await render(
      "password-reset",
      input({ variables: { email: "{{orderNumber}}", orderNumber: "37" } }),
    );
    // password-reset takes `email` only, so {{orderNumber}} stays, in the copy and in the value.
    expect(email.subject).toBe("Order {{orderNumber}} for {{orderNumber}}");
  });

  it.each(["javascript:alert(1)", "/us/verify?code=1", "data:text/html,hi", "mailto:a@b.c", ""])(
    "refuses the link %j: only an absolute http(s) URL",
    async (url) => {
      await expect(render("verify-email", input({ url }))).rejects.toThrow(/http\(s\)/);
    },
  );

  it("draws a rich-text link only when it is http(s) or mailto", async () => {
    const body = {
      root: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                fields: { url: "javascript:alert(1)" },
                children: [{ type: "text", text: "bad" }],
              },
              { type: "text", text: " and " },
              {
                type: "link",
                fields: { url: "https://shop.example/help" },
                children: [{ type: "text", text: "help" }],
              },
            ],
          },
        ],
      },
    };
    const email = await render("verify-email", input({ copy: { ...copy([]), body } }));
    expect(email.html).not.toContain("javascript:");
    expect(email.html).toContain('href="https://shop.example/help"');
    expect(email.text).toContain("bad (javascript:alert(1)) and help (https://shop.example/help)");
  });

  it("writes Persian right to left: dir=rtl on the document and the frame", async () => {
    const email = await render("verify-email", input({ language: "fa" }));
    expect(email.html).toContain('<html lang="fa" dir="rtl">');
    expect(email.html).toMatch(/data-slot="email-frame"[^>]*|lang="fa" dir="rtl"/);
    expect(email.html.match(/dir="rtl"/g)?.length).toBe(2);
    const greek = await render("verify-email", input({ language: "el" }));
    expect(greek.html).toContain('<html lang="el" dir="ltr">');
  });

  it("puts the preheader first in the body, hidden, and the subject in the title", async () => {
    const email = await render("verify-email", input());
    const body = email.html.slice(email.html.indexOf("<body"));
    expect(body.indexOf("For o&#x27;brien@example.com")).toBeLessThan(body.indexOf("<table"));
    expect(email.text).not.toContain("For o'brien@example.com");
  });

  it("lays out every type with the seed's copy in its four languages", async () => {
    expect(Object.keys(templates.variables)).toEqual([...EMAIL_TYPES]);
    for (const type of EMAIL_TYPES) {
      expect(templates.variables[type]).toEqual(EMAIL_VARIABLES[type]);
      for (const [language, seeded] of Object.entries(templates.templates[type])) {
        const email = await render(type, {
          copy: { ...seeded, body: paragraphs(seeded.body) },
          variables: { email: "ana@example.com", code: "c0de", orderNumber: "37" },
          url: "https://shop.example/x",
          language,
          shop: { name: "Shopblok" },
        });
        expect(email.html, `${type} ${language}`).not.toContain("{{");
        expect(email.text).toContain(seeded.cta.replace("{{orderNumber}}", "37"));
        expect(email.subject).not.toContain("{{");
      }
    }
  });
});
