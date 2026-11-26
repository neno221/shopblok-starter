import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consumeLimit = vi.fn();
vi.mock("./rate-limit", () => ({ consumeLimit: (...args: unknown[]) => consumeLimit(...args) }));

const {
  checkChallenge,
  requireChallenge,
  resetTurnstileLog,
  SITEVERIFY_URL,
  turnstileKeys,
  turnstileSiteKey,
} = await import("./turnstile");

// Cloudflare's published test keys (always passes; always fails).
const PASS = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

const answer = (body: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }));

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  consumeLimit.mockReset();
  resetTurnstileLog();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("turnstileKeys (M7 D143)", () => {
  it("is on only with both keys", () => {
    expect(turnstileKeys({})).toBeUndefined();
    expect(turnstileKeys({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: "x" })).toBeUndefined();
    expect(turnstileKeys({ ...PASS, TURNSTILE_SECRET_KEY: "  " })).toBeUndefined();
    expect(turnstileKeys(PASS)).toEqual({
      siteKey: PASS.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      secretKey: PASS.TURNSTILE_SECRET_KEY,
    });
    expect(turnstileSiteKey(PASS)).toBe(PASS.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  });
});

describe("checkChallenge (M7 D143)", () => {
  it("is off without the keys, and asks nobody", async () => {
    const fetcher = answer({ success: true });
    expect(await checkChallenge("token", {}, fetcher)).toBe("off");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls a post with no token one sent without scripts", async () => {
    expect(await checkChallenge(undefined, PASS, answer({}))).toBe("no-script");
    expect(await checkChallenge("  ", PASS, answer({}))).toBe("no-script");
  });

  it("asks Siteverify with the secret and the token, and reads its answer", async () => {
    const fetcher = answer({ success: true });
    expect(await checkChallenge("XXXX.DUMMY.TOKEN.XXXX", PASS, fetcher)).toBe("passed");
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(SITEVERIFY_URL);
    const body = init?.body as URLSearchParams;
    expect([body.get("secret"), body.get("response")]).toEqual([
      PASS.TURNSTILE_SECRET_KEY,
      "XXXX.DUMMY.TOKEN.XXXX",
    ]);
    // A PC's 127.0.0.1 is never sent as the visitor's address.
    expect(body.has("remoteip")).toBe(false);
    expect(
      await checkChallenge(
        "t",
        PASS,
        answer({ success: false, "error-codes": ["invalid-input-response"] }),
      ),
    ).toBe("failed");
    expect(await checkChallenge("x".repeat(2049), PASS, fetcher)).toBe("failed");
  });

  it("takes the post when Cloudflare cannot be reached, logging it", async () => {
    const down = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await checkChallenge("t", PASS, down)).toBe("passed");
    expect(String(warn.mock.calls[0]?.[0])).toContain("Siteverify could not be reached");
  });

  it.each([
    "invalid-input-response",
    "timeout-or-duplicate",
    "missing-input-response",
    "bad-request",
  ])("refuses a token Cloudflare refuses (%s)", async (code) => {
    expect(await checkChallenge("t", PASS, answer({ success: false, "error-codes": [code] }))).toBe(
      "failed",
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("takes the post when Cloudflare fails on its side: a non-2xx answer or internal-error", async () => {
    const status = (code: number) =>
      vi.fn<typeof fetch>(
        async () => new Response(JSON.stringify({ success: false }), { status: code }),
      );
    expect(await checkChallenge("t", PASS, status(500))).toBe("passed");
    expect(String(warn.mock.calls[0]?.[0])).toContain("Siteverify answered 500");
    resetTurnstileLog();
    expect(
      await checkChallenge(
        "t",
        PASS,
        answer({ success: false, "error-codes": ["internal-error"] }),
      ),
    ).toBe("passed");
    expect(String(warn.mock.calls[1]?.[0])).toContain("failed on its side (internal-error)");
    // Once a minute: a second failure says nothing more.
    expect(await checkChallenge("t", PASS, status(503))).toBe("passed");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it.each(["invalid-input-secret", "missing-input-secret"])(
    "takes the post when Cloudflare refuses the secret (%s), with its own log line",
    async (code) => {
      expect(
        await checkChallenge("t", PASS, answer({ success: false, "error-codes": [code] })),
      ).toBe("passed");
      expect(String(warn.mock.calls[0]?.[0])).toContain("Cloudflare refuses TURNSTILE_SECRET_KEY");
    },
  );
});

describe("requireChallenge (M7 D143)", () => {
  it("refuses a token Cloudflare refuses as `challenge`", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", PASS.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    vi.stubEnv("TURNSTILE_SECRET_KEY", PASS.TURNSTILE_SECRET_KEY);
    vi.stubGlobal("fetch", answer({ success: false, "error-codes": ["invalid-input-response"] }));
    await expect(requireChallenge("token")).rejects.toMatchObject({ form: "challenge" });
    vi.unstubAllGlobals();
  });

  it("lets everything through without the keys", async () => {
    await expect(requireChallenge(undefined)).resolves.toBeUndefined();
    expect(consumeLimit).not.toHaveBeenCalled();
  });

  it("takes a post without scripts once an hour (form-no-script), then refuses with the wait", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", PASS.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    vi.stubEnv("TURNSTILE_SECRET_KEY", PASS.TURNSTILE_SECRET_KEY);
    consumeLimit.mockResolvedValueOnce({ allowed: true });
    await expect(requireChallenge("")).resolves.toBeUndefined();
    expect(consumeLimit).toHaveBeenCalledWith("form-no-script");
    consumeLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 1800 });
    await expect(requireChallenge(undefined)).rejects.toMatchObject({
      form: "too-many",
      retryAfter: 1800,
    });
  });
});
