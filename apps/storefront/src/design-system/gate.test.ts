import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const root = vi.hoisted(() => ({ locale: vi.fn<() => Promise<string>>() }));
vi.mock("next/root-params", () => root);

import { requireDesignSystemLocale, staticParams } from "./gate";

const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

beforeEach(() => root.locale.mockResolvedValue("en"));
afterEach(() => {
  vi.unstubAllEnvs();
  root.locale.mockReset();
});

describe("requireDesignSystemLocale", () => {
  it("ends the render with a 404 in a production build without the flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const flag of ["", "false", "1", "TRUE"]) {
      vi.stubEnv("DESIGN_SYSTEM_ENABLED", flag);
      await expect(requireDesignSystemLocale(), `flag=${flag}`).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("answers the locale when the flag is `true`", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    for (const locale of ["en", "el", "de", "fr"]) {
      root.locale.mockResolvedValue(locale);
      await expect(requireDesignSystemLocale()).resolves.toBe(locale);
    }
  });

  it("answers in `next dev` without the flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    await expect(requireDesignSystemLocale()).resolves.toBe("en");
  });

  it("is a 404 for a locale that is not one of the four, flag on", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const segment of ["xx", "EN", "en-US", "el-CY", "", "pt"]) {
      root.locale.mockResolvedValue(segment);
      await expect(requireDesignSystemLocale(), segment).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("does not even read the locale when the gate is shut", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    await expect(requireDesignSystemLocale()).rejects.toMatchObject(NOT_FOUND);
    expect(root.locale).not.toHaveBeenCalled();
  });
});

describe("staticParams", () => {
  const all = [{ n: 1 }, { n: 2 }, { n: 3 }];

  it("lists every param when the pages are on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    expect(staticParams(all)).toEqual(all);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    expect(staticParams(all)).toEqual(all);
  });

  it("lists exactly one when they are off (Cache Components wants at least one)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    expect(staticParams(all)).toEqual([{ n: 1 }]);
  });
});
