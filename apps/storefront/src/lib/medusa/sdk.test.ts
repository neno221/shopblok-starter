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

  it("does not keep a settings problem: once the key is there, the next call works", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "");
    stubMedusaFetch(() => ({ body: { regions: [] } }));
    const { medusaRequest } = await loadSdk();
    await expect(medusaRequest((sdk) => sdk.store.region.list())).rejects.toMatchObject({
      name: "EnvError",
    });
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
    await expect(medusaRequest((sdk) => sdk.store.region.list())).resolves.toBeDefined();
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
