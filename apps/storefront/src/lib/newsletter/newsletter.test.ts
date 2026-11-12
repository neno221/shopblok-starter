// T99 (D122): the newsletter's double opt-in. The token (signed, 48 hours), Resend's contacts
// against a stand-in `fetch`, the sign-up action (an e-mail with the link, nothing stored), and the
// confirmation's POST (one use: the record is unique, a second POST finds it taken, a failure takes
// it back). Payload is a stand-in that keeps its documents in memory and refuses a second record
// with the same `tokenId`, as the unique index does.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formFields } from "../forms/fields";
import { seeded } from "../markets/test-maps";

const SECRET = "a-test-secret-of-the-payload-kind";
vi.stubEnv("PAYLOAD_SECRET", SECRET);
vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shop.example");

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));
const readForm = vi.fn();
vi.mock("../cms/forms", () => ({
  readForm,
  isFormPlaced: async (_reader: unknown, id: number) => id === 3,
}));

type Doc = Record<string, unknown> & { id: number };
const store = vi.hoisted(() => ({
  confirmations: [] as Doc[],
  submissions: [] as Doc[],
  sent: [] as { to: string; subject: string; html: string; text: string }[],
  next: 1,
}));
const payload = {
  count: vi.fn(async ({ where }: { where: { tokenId: { equals: string } } }) => ({
    totalDocs: store.confirmations.filter((doc) => doc["tokenId"] === where.tokenId.equals).length,
  })),
  create: vi.fn(async ({ collection, data }: { collection: string; data: Doc }) => {
    if (collection === "newsletter-confirmations") {
      if (store.confirmations.some((doc) => doc["tokenId"] === data["tokenId"]))
        throw new Error("ValidationError: tokenId must be unique");
      const doc = { ...data, id: store.next++ };
      store.confirmations.push(doc);
      return doc;
    }
    const doc = { ...data, id: store.next++ };
    store.submissions.push(doc);
    return doc;
  }),
  update: vi.fn(async ({ id, data }: { id: number; data: Doc }) => {
    const doc = store.confirmations.find((each) => each.id === id);
    Object.assign(doc ?? {}, data);
    return doc;
  }),
  delete: vi.fn(async ({ id }: { id: number }) => {
    store.confirmations = store.confirmations.filter((doc) => doc.id !== id);
  }),
  findByID: vi.fn(async () => ({ fields: [{ blockType: "email", name: "email" }] })),
  // The copy (`send-email.ts`): none in Payload, so the seed's English; the shop's name.
  find: vi.fn(async () => ({ docs: [] })),
  findGlobal: vi.fn(async () => ({ storeName: "Kalimera" })),
  sendEmail: vi.fn(async (email: (typeof store.sent)[number]) => {
    store.sent.push(email);
  }),
  logger: { warn: vi.fn(), error: vi.fn() },
};
vi.mock("../cms/payload", () => ({ getPayloadClient: async () => payload }));

const { readToken, signToken, tokenKey, TOKEN_LIFETIME_MS } = await import("./token");
const { addToSegment, removeContact, resendContactsConfig } = await import("./resend-contacts");
const { subscribeAction } = await import("./subscribe");
const { confirmSubscription, readConfirmation } = await import("./confirm");

const newsletter = {
  id: 3,
  fields: formFields([{ blockType: "email", name: "email", label: "Email", required: true }]),
};

beforeEach(() => {
  store.confirmations = [];
  store.submissions = [];
  store.sent = [];
  readForm.mockReset().mockResolvedValue(newsletter);
  for (const fn of [payload.count, payload.create, payload.update, payload.delete]) fn.mockClear();
  payload.sendEmail.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "");
});

const key = () => tokenKey(SECRET);
const claims = { email: "ana@example.com", form: 3, market: "en-us", language: "en" };

describe("the confirmation token (D122)", () => {
  it("reads back what it signed, until 48 hours have passed", () => {
    const now = Date.UTC(2026, 10, 12);
    const { token, claims: signed } = signToken(claims, key(), now);
    expect(readToken(token, key(), now)).toEqual(signed);
    expect(signed).toMatchObject({ ...claims, exp: now + TOKEN_LIFETIME_MS });
    expect(readToken(token, key(), now + TOKEN_LIFETIME_MS - 1)).not.toBeNull();
    expect(readToken(token, key(), now + TOKEN_LIFETIME_MS)).toBeNull();
  });

  it("refuses a token changed, cut short, or signed with another secret", () => {
    const { token } = signToken(claims, key());
    const [body, signature] = token.split(".") as [string, string];
    const other = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), email: "x@y.z" }),
    ).toString("base64url");
    expect(readToken(`${other}.${signature}`, key())).toBeNull();
    expect(readToken(body, key())).toBeNull();
    expect(readToken(`${body}.${signature}.x`, key())).toBeNull();
    expect(readToken(token, tokenKey("another-secret"))).toBeNull();
    expect(readToken(42, key())).toBeNull();
    expect(() => tokenKey("")).toThrow(/PAYLOAD_SECRET/);
  });

  it("gives each token its own id", () => {
    expect(signToken(claims, key()).claims.id).not.toBe(signToken(claims, key()).claims.id);
  });
});

describe("Resend's contacts (D122)", () => {
  const config = { apiKey: "re_test_fake", segmentId: "seg_1", baseUrl: "https://resend.test/" };

  function fakeResend(answers: Record<string, number>) {
    const calls: { method: string; path: string; body: unknown; auth: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname;
        calls.push({
          method: init.method ?? "GET",
          path,
          body: init.body ? JSON.parse(String(init.body)) : undefined,
          auth: new Headers(init.headers).get("authorization"),
        });
        const status = answers[`${init.method} ${path}`] ?? 200;
        return new Response(JSON.stringify(status < 300 ? { id: "c1" } : { name: "some_error" }), {
          status,
        });
      }),
    );
    return calls;
  }

  it("is on with the key and the segment only", () => {
    expect(resendContactsConfig({ RESEND_API_KEY: "k" })).toBeUndefined();
    expect(resendContactsConfig({ RESEND_NEWSLETTER_SEGMENT_ID: "s" })).toBeUndefined();
    expect(
      resendContactsConfig({ RESEND_API_KEY: "k", RESEND_NEWSLETTER_SEGMENT_ID: "s" }),
    ).toEqual({ apiKey: "k", segmentId: "s" });
  });

  it("creates the contact in the segment, subscribed", async () => {
    const calls = fakeResend({});
    await addToSegment(config, "ana@example.com");
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/contacts",
        body: { email: "ana@example.com", unsubscribed: false, segments: [{ id: "seg_1" }] },
        auth: "Bearer re_test_fake",
      },
    ]);
  });

  it("subscribes a contact that exists again and adds it to the segment", async () => {
    const calls = fakeResend({ "POST /contacts": 409 });
    await addToSegment(config, "ana+news@example.com");
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "POST /contacts",
      "PATCH /contacts/ana%2Bnews%40example.com",
      "POST /contacts/ana%2Bnews%40example.com/segments/seg_1",
    ]);
    expect(calls[1]?.body).toEqual({ unsubscribed: false });
  });

  it("reports a refused key or an outage, naming neither the key nor the address", async () => {
    fakeResend({ "POST /contacts": 401 });
    const refused = await addToSegment(config, "ana@example.com").catch((error: Error) => error);
    expect(String(refused)).toBe(
      "ResendContactError: resend: create contact answered 401 (some_error)",
    );
    fakeResend({ "POST /contacts": 500 });
    await expect(addToSegment(config, "ana@example.com")).rejects.toThrow(/answered 500/);
  });

  it("removes a contact, and a contact already gone is no error", async () => {
    const calls = fakeResend({ "DELETE /contacts/gone%40example.com": 404 });
    await removeContact(config, "ana@example.com");
    await removeContact(config, "gone@example.com");
    expect(calls.map((call) => call.method)).toEqual(["DELETE", "DELETE"]);
  });
});

describe("the sign-up: an e-mail with the link, nothing stored (D122)", () => {
  it("e-mails the address the confirmation link, in the market's language and on its page", async () => {
    const result = await subscribeAction({
      market: "fr-ch",
      form: "3",
      answers: { email: "o'brien@example.com", website: "" },
    });
    expect(result).toEqual({ ok: true, data: { sent: true } });
    expect(payload.create).not.toHaveBeenCalled();
    const [email] = store.sent;
    expect(email?.to).toBe("o'brien@example.com");
    const link = /https:\/\/shop\.example\/ch\/fr\/newsletter\/confirm\?token=[^"\s]+/.exec(
      email?.text ?? "",
    )?.[0];
    expect(link).toBeDefined();
    const token = new URL(link ?? "").searchParams.get("token");
    expect(readToken(token, key())).toMatchObject({
      email: "o'brien@example.com",
      form: 3,
      market: "fr-ch",
      language: "fr",
    });
    expect(email?.html).toContain("o&#x27;brien@example.com");
  });

  it("answers a filled spam trap as a person and sends nothing", async () => {
    const result = await subscribeAction({
      market: "en-us",
      form: "3",
      answers: { email: "bot@example.com", website: "https://spam.example" },
    });
    expect(result).toEqual({ ok: true, data: { sent: false } });
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses an address it cannot use, a form that is not placed, and a form that is not a newsletter's", async () => {
    expect(
      await subscribeAction({ market: "en-us", form: "3", answers: { email: "not-an-address" } }),
    ).toMatchObject({ ok: false, errors: { email: "pattern" } });
    expect(
      await subscribeAction({ market: "en-us", form: "4", answers: { email: "a@example.com" } }),
    ).toMatchObject({ ok: false, form: "not-found" });
    readForm.mockResolvedValue({
      id: 3,
      fields: formFields([
        { blockType: "text", name: "name", label: "Name", required: true },
        { blockType: "email", name: "email", label: "Email", required: true },
      ]),
    });
    expect(
      await subscribeAction({ market: "en-us", form: "3", answers: { email: "a@example.com" } }),
    ).toMatchObject({ ok: false, form: "not-found" });
    expect(payload.sendEmail).not.toHaveBeenCalled();
  });

  it("answers as unavailable when the e-mail cannot go, without the address in the log", async () => {
    payload.sendEmail.mockRejectedValueOnce(new Error("SMTP refused secret@example.com"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await subscribeAction({
      market: "en-us",
      form: "3",
      answers: { email: "secret@example.com" },
    });
    expect(result).toMatchObject({ ok: false, form: "unavailable" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret@example.com");
    log.mockRestore();
  });
});

describe("the confirmation: only the POST uses the token, once (D122)", () => {
  const token = () => signToken(claims, key()).token;

  it("reads a link without writing anything (what the page's GET does)", async () => {
    const link = token();
    expect(await readConfirmation(link)).toMatchObject({ kind: "valid", claims });
    expect(await readConfirmation("nonsense")).toEqual({ kind: "expired" });
    expect(payload.create).not.toHaveBeenCalled();
    expect(store.confirmations).toEqual([]);
  });

  it("keeps the address as a confirmed submission without Resend, and records the consent", async () => {
    expect(await confirmSubscription(token())).toBe("done");
    expect(store.submissions).toEqual([
      expect.objectContaining({
        form: 3,
        submissionData: [
          { field: "email", value: "ana@example.com" },
          { field: "confirmed", value: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) },
        ],
      }),
    ]);
    expect(store.confirmations).toEqual([
      expect.objectContaining({
        email: "ana@example.com",
        market: "en-us",
        language: "en",
        destination: "submission",
      }),
    ]);
  });

  it("refuses the same link a second time: no second submission, no second contact", async () => {
    const link = token();
    expect(await confirmSubscription(link)).toBe("done");
    expect(await confirmSubscription(link)).toBe("used");
    expect(store.submissions).toHaveLength(1);
    expect(store.confirmations).toHaveLength(1);
    expect(await readConfirmation(link)).toEqual({ kind: "used" });
  });

  it("lets one of two POSTs at once through", async () => {
    const link = token();
    const outcomes = await Promise.all([confirmSubscription(link), confirmSubscription(link)]);
    expect(outcomes.sort()).toEqual(["done", "used"]);
    expect(store.submissions).toHaveLength(1);
  });

  it("refuses an expired or changed link", async () => {
    const old = signToken(claims, key(), Date.now() - TOKEN_LIFETIME_MS - 1).token;
    expect(await confirmSubscription(old)).toBe("expired");
    expect(await confirmSubscription(`${token()}x`)).toBe("expired");
    expect(await confirmSubscription(null)).toBe("expired");
    expect(store.confirmations).toEqual([]);
  });

  it("adds the address to Resend's segment with the key and the segment", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_fake");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "seg_1");
    vi.stubEnv("RESEND_BASE_URL", "https://resend.test");
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "c1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    expect(await confirmSubscription(token())).toBe("done");
    expect(fetch).toHaveBeenCalledOnce();
    expect(store.submissions).toEqual([]);
    expect(store.confirmations[0]).toMatchObject({ destination: "resend" });
  });

  it("takes the record back when the address cannot be added, so the link can be tried again", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_fake");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "seg_1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const link = token();
    expect(await confirmSubscription(link)).toBe("failed");
    expect(store.confirmations).toEqual([]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("ana@example.com");
    log.mockRestore();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 201 })),
    );
    expect(await confirmSubscription(link)).toBe("done");
  });
});
