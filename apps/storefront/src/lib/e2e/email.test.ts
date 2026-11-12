import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => ({
  emails: [] as unknown[],
  adapter: "resend-rest" as string | null,
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("../cms/payload", () => ({
  getPayloadClient: async () => ({
    email: sent.adapter === null ? undefined : { name: sent.adapter },
    sendEmail: async (message: unknown) => {
      sent.emails.push(message);
      return { id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c" };
    },
  }),
}));

import { sendTestEmail } from "./email";

const post = (to: string) =>
  sendTestEmail(
    new Request(`http://localhost:8000/next/e2e/email?to=${encodeURIComponent(to)}`, {
      method: "POST",
    }),
  );

beforeEach(() => {
  sent.emails = [];
  sent.adapter = "resend-rest";
  vi.stubEnv("E2E_TEST_ROUTES", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("/next/e2e/email (T98)", () => {
  it("is a 404 that sends nothing unless E2E_TEST_ROUTES is `true`", async () => {
    vi.stubEnv("E2E_TEST_ROUTES", "");
    expect((await post("delivered@resend.dev")).status).toBe(404);
    expect(sent.emails).toEqual([]);
  });

  it("sends one e-mail to a Resend test address and answers the adapter and Resend's id", async () => {
    const response = await post("delivered+payload-t98@resend.dev");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ adapter: "resend-rest", id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c" });
    expect(JSON.stringify(body)).not.toContain("resend.dev");
    expect(sent.emails).toEqual([
      expect.objectContaining({ to: "delivered+payload-t98@resend.dev" }),
    ]);
  });

  it.each([
    "someone@example.com",
    "delivered@resend.dev.example.com",
    "delivered@resend.dev, someone@example.com",
    "",
  ])("refuses %j: only Resend's test addresses", async (to) => {
    expect((await post(to)).status).toBe(400);
    expect(sent.emails).toEqual([]);
  });

  it("answers 409 without an adapter (no key and no SMTP_HOST)", async () => {
    sent.adapter = null;
    expect((await post("delivered@resend.dev")).status).toBe(409);
    expect(sent.emails).toEqual([]);
  });
});
