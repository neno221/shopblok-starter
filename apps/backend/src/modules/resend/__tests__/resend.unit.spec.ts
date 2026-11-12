import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { sendStorefrontLink } from "../../../lib/storefront-mail";
import { PAYLOAD_MODULE } from "../../payload";
import { ResendNotificationProviderService, withoutAddresses } from "../service";

/**
 * M6 D121 (T98): the Resend provider against a fake Resend (the SDK's `baseUrl`, as
 * `RESEND_BASE_URL` sets it), fed by the real path an e-mail takes: the subscriber's
 * `sendStorefrontLink`, the copy from Payload in four languages (or the built-in English when
 * Payload is down), `@shopblok/emails`' layout, the Notification Module's `content`, the provider.
 * The live check against Resend itself is `e2e/integrations/resend.spec.ts` (with the secret).
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
) as { templates: Record<string, Record<string, FixtureCopy>> };

type Received = { method?: string; path?: string; headers: IncomingMessage["headers"]; body: any };

let server: Server;
let baseUrl: string;
const received: Received[] = [];
/** What the fake answers next: Resend's id, or Resend's error. */
let answer: { status: number; body: unknown } = { status: 200, body: { id: "fake-id" } };

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      received.push({
        method: request.method,
        path: request.url,
        headers: request.headers,
        body: raw === "" ? undefined : JSON.parse(raw),
      });
      response.writeHead(answer.status, { "content-type": "application/json" });
      response.end(JSON.stringify(answer.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  received.length = 0;
  answer = { status: 200, body: { id: "fake-id" } };
  payloadDown = false;
});

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
const provider = () =>
  new ResendNotificationProviderService({ logger } as never, {
    api_key: "re_fake_key_for_the_fake",
    from: "Shop <onboarding@resend.dev>",
    base_url: baseUrl,
  });

let payloadDown = false;
const paragraph = (value: string) => ({
  type: "paragraph",
  children: [{ type: "text", text: value }],
});

/** A container with what `sendStorefrontLink` resolves; the Notification Module calls the provider. */
function containerFor(service: ResendNotificationProviderService) {
  const payload = {
    findEmailTemplate: async (type: string, language: string) => {
      if (payloadDown) throw new Error("connect ECONNREFUSED 127.0.0.1:8000");
      const copy = fixture.templates[type]?.[language];
      return copy === undefined
        ? null
        : { ...copy, body: { root: { type: "root", children: copy.body.map(paragraph) } } };
    },
  };
  return {
    hasRegistration: (key: string) => key === PAYLOAD_MODULE,
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.CONFIG_MODULE)
        return { admin: { storefrontUrl: "https://shop.example" } };
      if (key === ContainerRegistrationKeys.LOGGER) return logger;
      if (key === PAYLOAD_MODULE) return payload;
      if (key === Modules.STORE) return { listStores: async () => [{ name: "Shopbloks Starter" }] };
      if (key === Modules.NOTIFICATION)
        return {
          createNotifications: async (notification: Parameters<typeof service.send>[0]) =>
            service.send(notification),
        };
      throw new Error(`not in the fake container: ${key}`);
    },
  };
}

const ADDRESS = "o'brien+t98@example.com";

async function verify(language: string, market = "/us") {
  await sendStorefrontLink(containerFor(provider()) as never, {
    to: ADDRESS,
    template: "customer-verification",
    type: "verify-email",
    values: { code: "c0de" },
    metadata: { market, language },
    path: "/verify",
    query: { code: "c0de" },
    idempotencyKey: `verification-${language}`,
  });
  expect(received).toHaveLength(1);
  return received[0]!;
}

describe("the Resend provider with a fake Resend (D121)", () => {
  it.each(["en", "el", "de", "fr"])(
    "sends the verification e-mail in %s: from, to, subject, HTML and text",
    async (language) => {
      const seeded = fixture.templates["verify-email"]![language]!;
      const request = await verify(language);
      expect(request.method).toBe("POST");
      expect(request.path).toBe("/emails");
      expect(request.headers.authorization).toBe("Bearer re_fake_key_for_the_fake");
      expect(request.body.from).toBe("Shop <onboarding@resend.dev>");
      expect(request.body.to).toEqual([ADDRESS]);
      expect(request.body.subject).toBe(seeded.subject);
      const html: string = request.body.html;
      expect(html).toContain(`<html lang="${language}" dir="ltr">`);
      expect(html).toContain(seeded.heading.replace(/'/g, "&#x27;"));
      expect(html).toContain(seeded.cta);
      expect(html).toContain('href="https://shop.example/us/verify?code=c0de"');
      expect(html).toContain("Shopbloks Starter");
      // The address is a text node: escaped once in the HTML, as written in the text.
      expect(html).toContain("o&#x27;brien+t98@example.com");
      expect(html).not.toContain(ADDRESS);
      const text: string = request.body.text;
      expect(text).toContain(ADDRESS);
      expect(text).toContain(`${seeded.cta}:\nhttps://shop.example/us/verify?code=c0de`);
    },
  );

  it("sends the built-in English when Payload is down", async () => {
    payloadDown = true;
    // A type and language no earlier test read, so no kept answer stands in for Payload.
    await sendStorefrontLink(containerFor(provider()) as never, {
      to: ADDRESS,
      template: "customer-password-reset",
      type: "password-reset",
      metadata: { market: "/fr", language: "fr" },
      path: "/reset-password",
      query: { token: "t" },
      idempotencyKey: "reset-fr",
    });
    const request = received[0]!;
    expect(request.body.subject).toBe("Reset your password");
    expect(request.body.html).toContain('<html lang="en" dir="ltr">');
    expect(request.body.text).toContain(
      "Choose a new password:\nhttps://shop.example/fr/reset-password?token=t",
    );
  });

  it("logs Resend's id with the template, never the address, and returns the id", async () => {
    logger.info.mockClear();
    answer = { status: 200, body: { id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c" } };
    const result = await provider().send({
      to: ADDRESS,
      channel: "email",
      template: "customer-verification",
      content: { subject: "S", html: "<p>H</p>", text: "T" },
    } as never);
    expect(result).toEqual({ id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c" });
    const lines = logger.info.mock.calls.map((call) => String(call[0]));
    expect(lines).toEqual([
      "resend: customer-verification sent, Resend id 4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
    ]);
    expect(lines.join("\n")).not.toContain("example.com");
  });

  it("throws Resend's refusal without any address in it, so Medusa marks the notification failed", async () => {
    answer = {
      status: 403,
      body: {
        statusCode: 403,
        name: "validation_error",
        message: `You can only send testing emails to your own email address (owner@example.com). Not to ${ADDRESS}.`,
      },
    };
    const sending = provider().send({
      to: ADDRESS,
      channel: "email",
      template: "customer-verification",
      content: { subject: "S", html: "<p>H</p>" },
    } as never);
    await expect(sending).rejects.toThrow(
      "resend: customer-verification was not accepted (validation_error: You can only send testing emails to your own email address (<address>). Not to <address>.).",
    );
  });

  it("refuses a notification with no rendered content, and sends nothing", async () => {
    await expect(
      provider().send({ to: ADDRESS, channel: "email", template: "x", data: {} } as never),
    ).rejects.toThrow(/no rendered content/);
    expect(received).toHaveLength(0);
  });

  it("needs its key and its sender", () => {
    expect(() => ResendNotificationProviderService.validateOptions({ from: "a@b.c" })).toThrow(
      /api_key/,
    );
    expect(() =>
      ResendNotificationProviderService.validateOptions({ api_key: "k", from: " " }),
    ).toThrow(/from/);
    expect(() =>
      ResendNotificationProviderService.validateOptions({ api_key: "k", from: "a@b.c" }),
    ).not.toThrow();
  });

  it("takes every address out of a message", () => {
    expect(withoutAddresses("to a.b+c@d.example, (x@y.z)")).toBe("to <address>, (<address>)");
  });
});
