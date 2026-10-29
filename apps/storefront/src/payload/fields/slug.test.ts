import type { PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  postSlugProblem,
  RESERVED_SEGMENTS,
  slugField,
  slugProblem,
  validateSlug,
  validatePostSlug,
} from "./slug";

describe("slugProblem", () => {
  it("takes lower-case letters of any script, digits and single hyphens", () => {
    for (const slug of ["about", "about-us", "team-2", "σχετικά-με-εμάς", "über-uns", "à-propos"]) {
      expect(slugProblem(slug, { topLevel: true }), slug).toBeNull();
    }
  });

  it("refuses capitals, spaces, slashes, dots, underscores and stray hyphens", () => {
    for (const slug of [
      "About",
      "about us",
      "about/team",
      "about.html",
      "about_us",
      "-about",
      "about-",
      "a--b",
      "",
    ]) {
      expect(slugProblem(slug, { topLevel: false }), slug).not.toBeNull();
    }
  });

  it("refuses the shop's own and reserved segments at the top level only", () => {
    for (const slug of RESERVED_SEGMENTS) {
      expect(slugProblem(slug, { topLevel: true }), slug).toMatch(/shop's own addresses/);
      expect(slugProblem(slug, { topLevel: false }), slug).toBeNull();
    }
    expect(RESERVED_SEGMENTS).toEqual(expect.arrayContaining(["admin", "api", "next", "checkout"]));
  });

  it("refuses two letters (a market's segment) at the top level only", () => {
    for (const slug of ["us", "gr", "de", "ελ"]) {
      expect(slugProblem(slug, { topLevel: true }), slug).toMatch(/market's address/);
      expect(slugProblem(slug, { topLevel: false }), slug).toBeNull();
    }
    expect(slugProblem("usa", { topLevel: true })).toBeNull();
    expect(slugProblem("u", { topLevel: true })).toBeNull();
  });
});

describe("validateSlug", () => {
  const count = vi.fn(async (_args: unknown) => ({ totalDocs: 0 }));
  const options = (data: Record<string, unknown>, id?: number) =>
    ({
      id,
      data,
      required: true,
      req: { locale: "el", payload: { config: {}, count }, t: (key: string) => key },
    }) as unknown as Parameters<typeof validateSlug>[1];

  it("is the field's check, and Payload's own runs first", async () => {
    expect(slugField()).toMatchObject({ name: "slug", localized: true, required: true });
    expect(slugField().validate).toBe(validateSlug);
    expect(await validateSlug("", options({}))).toBe("validation:required");
  });

  it("refuses a two-letter or reserved slug without a parent, and takes it under one", async () => {
    expect(await validateSlug("us", options({}))).toMatch(/market's address/);
    expect(await validateSlug("cart", options({ parent: null }))).toMatch(/shop's own/);
    expect(await validateSlug("us", options({ parent: 4 }))).toBe(true);
    expect(await validateSlug("cart", options({ parent: { id: 4 } }))).toBe(true);
  });

  it("refuses a slug another page under the same parent has, in the language saved", async () => {
    count.mockClear();
    count.mockResolvedValueOnce({ totalDocs: 1 });
    expect(await validateSlug("team", options({ parent: 4 }, 9))).toMatch(/already has this slug/);
    const args = count.mock.calls[0]?.[0] as {
      where: unknown;
      locale: string;
      req: PayloadRequest;
    };
    expect(args.locale).toBe("el");
    expect(args.where).toEqual({
      and: [{ slug: { equals: "team" } }, { parent: { equals: 4 } }, { id: { not_equals: 9 } }],
    });
    expect(await validateSlug("about", options({}))).toBe(true);
    expect(count.mock.calls[1]?.[0]).toMatchObject({
      where: { and: [{ slug: { equals: "about" } }, { parent: { exists: false } }] },
    });
  });
});

describe("postSlugProblem (T66)", () => {
  it("takes a page's segments, reserved and two-letter ones too (a post is under /journal)", () => {
    for (const slug of ["autumn-layers", "φροντίδα-πλεκτών", "us", "checkout"])
      expect(postSlugProblem(slug), slug).toBeNull();
  });

  it("refuses what a page's slug refuses, and `page`, the journal's later pages' address", () => {
    expect(postSlugProblem("Autumn Layers")).toMatch(/lower-case letters/);
    expect(postSlugProblem("page")).toMatch(/journal's later pages/);
  });
});

describe("validatePostSlug (T66)", () => {
  const options = (totalDocs: number, id?: number) => {
    const count = vi.fn(async () => ({ totalDocs }));
    return {
      count,
      args: {
        id,
        req: { locale: "el", payload: { count } } as unknown as PayloadRequest,
      } as unknown as Parameters<typeof validatePostSlug>[1],
    };
  };

  it("refuses a slug another post has in the language being saved", async () => {
    const { count, args } = options(1, 4);
    expect(await validatePostSlug("welcome", args)).toBe("Another post already has this slug.");
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        locale: "el",
        where: { and: [{ slug: { equals: "welcome" } }, { id: { not_equals: 4 } }] },
      }),
    );
  });

  it("takes a free slug, and says why `page` is refused before asking", async () => {
    expect(await validatePostSlug("welcome", options(0).args)).toBe(true);
    const { count, args } = options(0);
    expect(await validatePostSlug("page", args)).toMatch(/journal's later pages/);
    expect(count).not.toHaveBeenCalled();
  });
});
