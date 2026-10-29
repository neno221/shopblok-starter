import { variantsOf } from "@shopblok/registry";
import type { AccessArgs, Field, GlobalConfig, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGES } from "../locales";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { Footer, oneProfilePerNetwork, profileUrl } from "./footer";
import { Header, HEADER_EXCLUDED_VARIANTS } from "./header";
import { SiteSettings, titleTemplate } from "./site-settings";

const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;
const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const integration = { collection: "integrations", id: 1, role: "medusa-sync" };

const GLOBALS: [string, GlobalConfig][] = [
  ["header", Header],
  ["footer", Footer],
  ["site-settings", SiteSettings],
];

/** A top-level field (inside tabs too) by name. */
function field(global: GlobalConfig, name: string): Field | undefined {
  const walk = (fields: readonly Field[]): Field | undefined => {
    for (const each of fields) {
      if ("name" in each && each.name === name) return each;
      if (each.type === "tabs") {
        for (const tab of each.tabs) {
          const found = walk(tab.fields);
          if (found !== undefined) return found;
        }
      }
    }
    return undefined;
  };
  return walk(global.fields);
}

const options = (select: Field | undefined) =>
  ((select as { options?: { value: string }[] } | undefined)?.options ?? []).map((o) => o.value);

describe.each(GLOBALS)("the %s global (D78)", (slug, global) => {
  it("is read by anyone once published, and as a draft by staff only", () => {
    const read = global.access?.read;
    expect(read?.(as(null))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(integration))).toEqual({ _status: { equals: "published" } });
    expect(read?.(as(editor))).toBe(true);
    expect(read?.(as(admin))).toBe(true);
  });

  it("is edited by staff, editors included, and never by an integration or a visitor", () => {
    const update = global.access?.update;
    expect(update?.(as(editor))).toBe(true);
    expect(update?.(as(admin))).toBe(true);
    expect(update?.(as(integration))).toBe(false);
    expect(update?.(as(null))).toBe(false);
  });

  it("keeps its versions from everyone but staff", () => {
    const readVersions = global.access?.readVersions;
    expect(readVersions?.(as(editor))).toBe(true);
    expect(readVersions?.(as(integration))).toBe(false);
    expect(readVersions?.(as(null))).toBe(false);
  });

  it("has drafts with autosave", () => {
    expect(global.versions).toMatchObject({ drafts: { autosave: expect.anything() }, max: 50 });
  });

  describe("revalidation", () => {
    beforeEach(() => revalidateTag.mockReset());
    const findGlobal = vi.fn();
    const req = () => ({
      locale: "el",
      context: {},
      payload: { logger: { warn: vi.fn() }, db: { findGlobal } },
    });

    async function save(rowBefore: string, doc: { _status: string }, rowAfter?: string) {
      const request = req();
      findGlobal.mockReset().mockResolvedValueOnce({ _status: rowBefore });
      if (rowAfter !== undefined) findGlobal.mockResolvedValueOnce({ _status: rowAfter });
      for (const hook of global.hooks?.beforeChange ?? [])
        await hook({ data: doc, global, req: request } as never);
      for (const hook of global.hooks?.afterChange ?? [])
        await hook({ doc, global, previousDoc: {}, req: request } as never);
    }

    it(`revalidates global:${slug}:<locale> in every language on a publish`, async () => {
      await save("draft", { _status: "published" });
      expect(revalidateTag.mock.calls.map(([tag]) => tag as string).sort()).toEqual(
        LANGUAGES.map((locale) => `global:${slug}:${locale}`).sort(),
      );
    });

    it("revalidates an unpublish, and nothing for a draft save over the published text", async () => {
      await save("published", { _status: "draft" }, "published");
      expect(revalidateTag).not.toHaveBeenCalled();
      await save("published", { _status: "draft" }, "draft");
      expect(revalidateTag).toHaveBeenCalled();
    });
  });
});

describe("the design fields (D85)", () => {
  it("offer the registry's header variants but the transparent one", () => {
    expect(options(field(Header, "design"))).toEqual(
      variantsOf("header")
        .map((variant) => variant.value)
        .filter((value) => !HEADER_EXCLUDED_VARIANTS.includes(value)),
    );
  });

  it("offer every footer variant", () => {
    expect(options(field(Footer, "design"))).toEqual(
      variantsOf("footer").map((variant) => variant.value),
    );
  });
});

describe("the footer's checks", () => {
  const args = { req: { payload: { config: {} }, t: (key: string) => key } } as never;

  it("takes an https profile only", () => {
    expect(profileUrl("https://instagram.com/shop", args)).toBe(true);
    expect(profileUrl("http://instagram.com/shop", args)).toBe("Use the profile's https address.");
    expect(profileUrl("javascript:alert(1)", args)).toBe("Use the profile's https address.");
  });

  it("takes each network once, and keeps Payload's row limit", () => {
    const row = (network: string) => ({ network, url: "https://example.com" });
    expect(oneProfilePerNetwork([row("x"), row("threads")], args)).toBe(true);
    expect(oneProfilePerNetwork([row("x"), row("x")], args)).toBe("Add each network once.");
    expect(
      oneProfilePerNetwork([row("x"), row("threads")], {
        ...(args as object),
        maxRows: 1,
      } as never),
    ).not.toBe(true);
  });
});

describe("the site settings' title template", () => {
  const args = { req: { payload: { config: {} }, t: (key: string) => key } } as never;

  it("needs %s once, or nothing", () => {
    expect(titleTemplate("%s · Shopblok", args)).toBe(true);
    expect(titleTemplate("", args)).toBe(true);
    expect(titleTemplate("Shopblok", args)).toBe("Put %s, once, where the page's title goes.");
    expect(titleTemplate("%s %s", args)).toBe("Put %s, once, where the page's title goes.");
  });
});
