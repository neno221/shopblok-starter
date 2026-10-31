import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const draft = { enable: vi.fn(), disable: vi.fn(), isEnabled: false };
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));
vi.mock("next/headers", () => ({ draftMode: async () => draft }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

import {
  respondWithDraftMode,
  respondWithRead,
  respondWithRevalidation,
  respondWithRuns,
} from "./handlers";

const at = (path: string) => new Request(`http://localhost:8000${path}`);
const read = vi.fn(async (locale: string) => ({
  runId: 1,
  at: "now",
  draft: false,
  titles: [locale],
}));

beforeEach(() => {
  revalidateTag.mockReset();
  draft.enable.mockReset();
  draft.disable.mockReset();
  read.mockClear();
  vi.stubEnv("E2E_TEST_ROUTES", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("the routes under /next/e2e", () => {
  it("are all a 404 unless E2E_TEST_ROUTES is `true`, and then do nothing at all", async () => {
    for (const value of ["", "1", "false"]) {
      vi.stubEnv("E2E_TEST_ROUTES", value);
      const responses = await Promise.all([
        respondWithRead(at("/next/e2e/pages?locale=el"), read),
        respondWithRuns(),
        respondWithDraftMode(at("/next/e2e/draft?on=1")),
        respondWithRevalidation(at("/next/e2e/revalidate?tag=pages:el&profile=max")),
      ]);
      expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404]);
    }
    expect(read).not.toHaveBeenCalled();
    expect(draft.enable).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("read in the language asked for, English by default", async () => {
    const el = await respondWithRead(at("/next/e2e/pages?locale=el"), read);
    expect(await el.json()).toMatchObject({ titles: ["el"] });
    const none = await respondWithRead(at("/next/e2e/pages"), read);
    expect(await none.json()).toMatchObject({ titles: ["en"] });
  });

  it("refuse a locale that is not a language code, before anything is read", async () => {
    for (const locale of ["", "EL", "el-GR", "../x", "e", "abcd"]) {
      const response = await respondWithRead(at(`/next/e2e/pages?locale=${locale}`), read);
      expect(response.status, locale).toBe(400);
    }
    expect(read).not.toHaveBeenCalled();
  });

  it("turn Draft Mode on, and off with ?on=0", async () => {
    await respondWithDraftMode(at("/next/e2e/draft?on=1"));
    expect(draft.enable).toHaveBeenCalledTimes(1);
    await respondWithDraftMode(at("/next/e2e/draft?on=0"));
    expect(draft.disable).toHaveBeenCalledTimes(1);
  });

  it("revalidate with expire 0 by default and stale-while-revalidate for max", async () => {
    await respondWithRevalidation(at("/next/e2e/revalidate?tag=pages:el&profile=expire0"));
    await respondWithRevalidation(at("/next/e2e/revalidate?tag=e2e:pages:el&profile=max"));
    expect(revalidateTag.mock.calls).toEqual([
      ["pages:el", { expire: 0 }],
      ["e2e:pages:el", "max"],
    ]);
  });

  it("revalidate only the tags the app's own tests use", async () => {
    for (const tag of [
      "",
      "medusa:products",
      "medusa:markets",
      "pages",
      "pages:",
      "x pages:el",
      "pages:EL",
      "pages:el:extra",
      "payload:global:markets",
    ]) {
      const response = await respondWithRevalidation(
        at(`/next/e2e/revalidate?tag=${encodeURIComponent(tag)}&profile=max`),
      );
      expect(response.status, tag).toBe(400);
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
