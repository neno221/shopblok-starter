import { describe, expect, it } from "vitest";
import { emailAdapter, emailTransport } from "./email";

describe("Payload's e-mail adapter by env (T98, D121)", () => {
  it("is Resend with both of its keys, trimmed, even beside SMTP_HOST", () => {
    expect(
      emailTransport({
        RESEND_API_KEY: " re_key ",
        RESEND_FROM_EMAIL: " shop@example.com ",
        SMTP_HOST: "localhost",
      }),
    ).toEqual({ kind: "resend", apiKey: "re_key", from: "shop@example.com" });
  });

  it("is Mailpit with SMTP_HOST, without both Resend keys", () => {
    expect(emailTransport({ SMTP_HOST: "localhost", SMTP_PORT: "2025" })).toEqual({
      kind: "smtp",
      host: "localhost",
      port: 2025,
    });
    expect(emailTransport({ RESEND_API_KEY: "re_key", SMTP_HOST: "localhost" })).toEqual({
      kind: "smtp",
      host: "localhost",
      port: 1025,
    });
    expect(emailTransport({ SMTP_HOST: "mailpit", SMTP_PORT: "x" })).toMatchObject({ port: 1025 });
  });

  it("is none without either, so Payload logs the e-mails as before", () => {
    expect(emailTransport({})).toEqual({ kind: "none" });
    expect(emailTransport({ SMTP_HOST: " ", RESEND_FROM_EMAIL: "a@b.c" })).toEqual({
      kind: "none",
    });
    expect(emailAdapter({})).toBeUndefined();
  });

  it("builds Resend's adapter with the sender, and Mailpit's without a start-up check", async () => {
    const resend = emailAdapter({
      RESEND_API_KEY: "re_key",
      RESEND_FROM_EMAIL: "shop@example.com",
    });
    expect(resend).toBeTypeOf("function");
    const smtp = await emailAdapter({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "1" });
    expect(smtp).toBeTypeOf("function");
  });
});
