import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheTag: (...args: unknown[]) => cacheTag(...args),
  cacheLife: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const find = vi.fn();
vi.mock("./payload", () => ({ getPayloadClient: async () => ({ find }) }));

import { readUiStrings } from "./ui-strings";

beforeEach(() => {
  vi.stubEnv("PAYLOAD_DATABASE_URL", "postgres://localhost/payload");
  find.mockReset();
  cacheTag.mockReset();
});

describe("readUiStrings (D77)", () => {
  it("reads every row's key and value in one query, anonymously, English as the fallback", async () => {
    find.mockResolvedValue({ docs: [] });
    await readUiStrings({ market: { language: "el" }, draft: false });
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith({
      collection: "ui-strings",
      locale: "el",
      fallbackLocale: "en",
      draft: false,
      overrideAccess: false,
      user: null,
      depth: 0,
      select: { key: true, value: true },
      pagination: false,
    });
    expect(cacheTag).toHaveBeenCalledWith("ui-strings:el");
  });

  it("keeps only the edited values that pass the check", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    find.mockResolvedValue({
      docs: [
        { id: 1, key: "templates.error.title", value: "Ωχ" },
        { id: 2, key: "atoms.stock.low", value: "Μόνο {total}" },
      ],
    });
    expect(await readUiStrings({ market: { language: "el" }, draft: false })).toEqual({
      "templates.error.title": "Ωχ",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("answers null without loading Payload when there is no database", async () => {
    vi.stubEnv("PAYLOAD_DATABASE_URL", "");
    expect(await readUiStrings({ market: { language: "el" }, draft: false })).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });
});
