import templates from "@shopblok/fixtures/email/templates.json";
import { describe, expect, it } from "vitest";
import { emailFixtures } from "@shopblok/fixtures";
import {
  EMAIL_TYPES,
  EMAIL_VARIABLES,
  paragraphs,
  render,
  type EmailInput,
  type EmailOrder,
} from ".";

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
    expect(Object.keys(templates.templates)).toEqual([...EMAIL_TYPES]);
    for (const type of EMAIL_TYPES) {
      expect(templates.variables[type]).toEqual(EMAIL_VARIABLES[type]);
      for (const language of ["en", "el", "de", "fr"] as const) {
        const fixture = emailFixtures[language][type];
        const email = await render(type, fixture);
        expect(email.html, `${type} ${language}`).not.toContain("{{");
        expect(email.subject, `${type} ${language}`).not.toContain("{{");
        expect(email.text).toContain(new URL(fixture.url).href);
      }
    }
  });
});

const order: EmailOrder = {
  number: "1042",
  date: "28 September 2026 at 09:00",
  lines: [
    { title: "Linen shirt <b>", detail: "Size: M", quantity: 2, total: "€90.00" },
    { title: "Socks", quantity: 1, total: "€12.00" },
  ],
  totals: [
    { kind: "subtotal", amount: "€102.00" },
    { kind: "discount", amount: "−€10.00" },
    { kind: "total", amount: "€92.00" },
  ],
  shipTo: ["Ana Pérez", "1 Main St", "1010 Nicosia", "CY"],
};

describe("the order e-mails (T99, D122)", () => {
  it("draws the order's lines and sums as text, in the copy's language", async () => {
    const email = await render("order-placed", input({ order, language: "de" }));
    expect(email.html).toContain('data-slot="email-order"');
    expect(email.html).toContain("Linen shirt &lt;b&gt;");
    expect(email.html).not.toContain("<b>");
    expect(email.html).toContain("Zwischensumme");
    expect(email.html).toContain("Gesamt");
    expect(email.text).toContain("2 × Linen shirt <b> (Size: M): €90.00");
    expect(email.text).toContain("Rabatt: −€10.00");
    expect(email.text).toContain("Lieferadresse:\nAna Pérez\n1 Main St");
  });

  it("reads English labels for a language the layout has none for", async () => {
    const email = await render("order-placed", input({ order, language: "mn" }));
    expect(email.text).toContain("Subtotal: €102.00");
  });

  it("links a tracking number only to an http(s) page, in the HTML and the text", async () => {
    const email = await render(
      "order-shipped",
      input({
        order: {
          ...order,
          tracking: [
            { number: "1Z1", url: "https://carrier.example/1Z1" },
            { number: "BAD", url: "javascript:alert(1)" },
            { number: "PLAIN" },
          ],
        },
      }),
    );
    expect(email.html).toContain('href="https://carrier.example/1Z1"');
    expect(email.html).not.toContain("javascript:");
    expect(email.html.match(/data-slot="email-tracking"/g)?.length).toBe(1);
    expect(email.text).toContain("Tracking:\n1Z1 (https://carrier.example/1Z1)\nBAD\nPLAIN");
    expect(email.text).not.toContain("javascript:");
  });

  it.each([
    "order-placed",
    "order-shipped",
    "order-canceled",
    "return-requested",
    "refund-issued",
  ] as const)("refuses %s without its order", async (type) => {
    await expect(render(type, input())).rejects.toThrow(/order's summary/);
  });
});

describe("the form e-mail (T99, D122)", () => {
  const form = {
    title: "Contact",
    answers: [
      { name: "name", label: "Name", value: "Ana" },
      { name: "message", label: "Message", value: '<img src=x onerror="alert(1)">' },
    ],
  };
  const formInput = (overrides: Partial<EmailInput["form"]> = {}) =>
    input({
      copy: { ...copy(["A visitor sent {{form}}."]), subject: "New answer to {{form}}" },
      variables: { form: "Contact" },
      url: "https://shop.example/admin/collections/form-submissions/42",
      form: { ...form, ...overrides },
    });

  it("draws every answer as text: markup a visitor sends never reaches the HTML", async () => {
    const email = await render("form-message", formInput());
    expect(email.html).not.toMatch(/<img/i);
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(email.subject).toBe("New answer to Contact");
    expect(email.text).toContain('Answers:\nName: Ana\nMessage: <img src=x onerror="alert(1)">');
  });

  it("takes the form's own subject and message, its {{fields}} filled in as text, {{*}} dropped", async () => {
    const email = await render(
      "form-message",
      formInput({
        subject: "{{name}} wrote on {{form}}",
        message: paragraphs(["From {{name}}: {{message}}", "{{*:table}}", "{{*}}"]),
      }),
    );
    expect(email.subject).toBe("Ana wrote on Contact");
    expect(email.html).not.toMatch(/<img/i);
    expect(email.html).toContain("From Ana: &lt;img");
    expect(email.html).not.toContain("{{*");
    expect(email.html).not.toContain("A visitor sent");
  });

  it("refuses form-message without its form", async () => {
    await expect(render("form-message", input())).rejects.toThrow(/needs the form/);
  });
});
