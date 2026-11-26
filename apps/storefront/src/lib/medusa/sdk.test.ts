import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectionRefused,
  PUBLISHABLE_KEY,
  stubMedusaFetch,
} from "../../test-support/medusa-fetch";

// The SDK is created once per module; a fresh module is a fresh process.
async function loadSdk() {
  vi.resetModules();
  return import("./sdk");
}

beforeEach(() => {
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("medusaRequest", () => {
  it("sends the publishable key to the backend URL, and no locale of its own", async () => {
    const calls = stubMedusaFetch(() => ({ body: { regions: [] } }));
    const { medusaRequest } = await loadSdk();
    await medusaRequest((sdk) => sdk.store.region.list());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url.origin).toBe("http://medusa.test:9000");
    expect(calls[0]!.url.pathname).toBe("/store/regions");
    expect(calls[0]!.headers.get("x-publishable-api-key")).toBe(PUBLISHABLE_KEY);
  });

  it("creates the SDK once and reuses it", async () => {
    stubMedusaFetch(() => ({ body: { regions: [] } }));
    const { medusaRequest } = await loadSdk();
    const seen = new Set<unknown>();
    for (let i = 0; i < 3; i++) await medusaRequest(async (sdk) => seen.add(sdk));
    expect(seen.size).toBe(1);
  });

  it("reads nothing from the environment until the first call (a build with no .env works)", async () => {
    vi.stubEnv("MEDUSA_BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "");
    await expect(loadSdk()).resolves.toBeDefined();
  });

  it("fails with the settings problem, not a Medusa one, when the key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "");
    const calls = stubMedusaFetch(() => ({ body: {} }));
    const { medusaRequest } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({
      name: "EnvError",
      message: expect.stringContaining("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"),
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    { problem: "a missing key", key: "", name: "EnvError" },
    // U+2026, a truncated key pasted from a page: it starts with `pk_`, so the settings check
    // passes, and `new Medusa()` then throws because a header value must be Latin-1.
    { problem: "a key the SDK refuses to send", key: "pk_0123456789…", name: "TypeError" },
  ])(
    "does not keep $problem: once the key is right, the next call works",
    async ({ key, name }) => {
      vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", key);
      stubMedusaFetch(() => ({ body: { regions: [] } }));
      const { medusaRequest } = await loadSdk();
      await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({ name });
      vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
      await expect(medusaRequest((sdk) => sdk.store.region.list())).resolves.toBeDefined();
    },
  );

  it("gives up on a backend that takes the connection and never answers", async () => {
    stubMedusaFetch(() => ({ body: { regions: [] } }));
    const { medusaRequest, MedusaRequestError, MEDUSA_REQUEST_TIMEOUT_MS } = await loadSdk();
    await medusaRequest((sdk) => sdk.store.region.list()); // creates the SDK before the clock stops
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    vi.useFakeTimers();
    const pending = medusaRequest((sdk) => sdk.store.region.list()).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(MEDUSA_REQUEST_TIMEOUT_MS);
    const error = await pending;
    expect(error).toBeInstanceOf(MedusaRequestError);
    expect(error).toMatchObject({ kind: "unreachable" });
    expect((error as Error).message).toContain("no answer after 10 s");
  });

  it("says so when the address answers with something that is not Medusa's JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Hello</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const { medusaRequest } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({
      name: "MedusaRequestError",
      kind: "rejected",
      status: undefined,
      message: expect.stringContaining("not with JSON"),
    });
  });

  it("turns a refused connection into an error that names the URL and the reason", async () => {
    stubMedusaFetch(() => connectionRefused());
    const { medusaRequest, MedusaRequestError } = await loadSdk();
    const error = await medusaRequest((sdk) => sdk.store.region.list()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MedusaRequestError);
    expect(error).toMatchObject({ kind: "unreachable", status: undefined });
    expect((error as Error).message).toContain("http://medusa.test:9000");
    expect((error as Error).message).toContain("ECONNREFUSED");
    expect((error as Error).message).toContain("pnpm dev");
  });

  it("turns an HTTP error into a rejected error with the status", async () => {
    stubMedusaFetch(() => ({ status: 500, body: { message: "boom" } }));
    const { medusaRequest } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({
      kind: "rejected",
      status: 500,
      message: expect.stringContaining("answered 500: boom"),
    });
  });

  it("points at the key when Medusa says one is required", async () => {
    stubMedusaFetch(() => ({ status: 400, body: { message: "Publishable API key required" } }));
    const { medusaRequest } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toThrow(
      /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY; `pnpm bootstrap` fills it/,
    );
  });

  it("keeps the original error as the cause", async () => {
    stubMedusaFetch(() => ({ status: 404, body: { message: "nope" } }));
    const { medusaRequest } = await loadSdk();
    const error = (await medusaRequest((sdk) => sdk.store.region.list()).catch(
      (e: unknown) => e,
    )) as Error;
    expect(error.cause).toMatchObject({ status: 404 });
  });
});

describe("localeHeaders", () => {
  it("is the header Medusa reads for the language (D8)", async () => {
    const { localeHeaders } = await loadSdk();
    expect(localeHeaders("el-GR")).toEqual({ "x-medusa-locale": "el-GR" });
  });

  it("puts the locale on the request, and a later call's locale replaces it", async () => {
    const calls = stubMedusaFetch(() => ({ body: { products: [] } }));
    const { medusaRequest, localeHeaders } = await loadSdk();
    await medusaRequest((sdk) => sdk.store.product.list({}, localeHeaders("el-GR")));
    await medusaRequest((sdk) => sdk.store.product.list({}, localeHeaders("de-DE")));
    await medusaRequest((sdk) => sdk.store.product.list({}));
    expect(calls.map((call) => call.headers.get("x-medusa-locale"))).toEqual([
      "el-GR",
      "de-DE",
      "",
    ]);
  });
});

// M7 D142 (T108): the signed visitor on every call, and the limiter's wait read back.
describe("the signed address", () => {
  it("signs each call for its method and path, as `server` with no visitor", async () => {
    vi.stubEnv("STOREFRONT_SIGNING_SECRET", "s");
    const calls = stubMedusaFetch(() => ({ body: { cart: { id: "cart_1" } } }));
    const { medusaRequest } = await loadSdk();
    const { clientSignature } = await import("../security/client-signature");
    await medusaRequest((sdk) => sdk.store.cart.retrieve("cart_1", { fields: "id" }));
    const [version, address, time, signature] = calls[0]!.headers
      .get("x-shopblok-client")!
      .split(";");
    expect([version, address]).toEqual(["v1", "server"]);
    expect(signature).toBe(
      clientSignature("s", {
        address: "server",
        time: Number(time),
        method: "GET",
        path: "/store/carts/cart_1",
      }),
    );
    // The query is not signed: Medusa's check reads the path alone.
    expect(calls[0]!.url.search).toContain("fields=id");
  });

  it("adds nothing without STOREFRONT_SIGNING_SECRET", async () => {
    const calls = stubMedusaFetch(() => ({ body: { regions: [] } }));
    const { medusaRequest } = await loadSdk();
    await medusaRequest((sdk) => sdk.store.region.list());
    expect(calls[0]!.headers.has("x-shopblok-client")).toBe(false);
  });

  it("reads the limiter's wait from a 429's message, a minute when it names none", async () => {
    stubMedusaFetch(() => ({
      status: 429,
      body: { type: "too_many_requests", message: "Too many requests: retry after 312 s." },
    }));
    const { medusaRequest, retryAfterOf } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({
      status: 429,
      retryAfter: 312,
    });
    expect(retryAfterOf("Too many")).toBe(60);
  });

  it("joins a base URL's own path as the SDK does", async () => {
    const { requestPath } = await loadSdk();
    expect(requestPath("/store/carts", "http://medusa.test:9000")).toBe("/store/carts");
    expect(requestPath("store/carts?x=1", "http://medusa.test:9000/api/")).toBe("/api/store/carts");
    expect(requestPath(new URL("http://medusa.test:9000/auth/session"), "http://x")).toBe(
      "/auth/session",
    );
  });
});
