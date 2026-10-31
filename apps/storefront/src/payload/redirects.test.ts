import { markets as seeded } from "@shopblok/fixtures";
import type { CollectionConfig, Config, Field, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MARKETS_UNREADABLE, redirects, validateCustomUrl, validateFrom } from "./redirects";

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag }));
// The market map is Medusa's (D95): the save checks read it through `get-market-map`, lazily.
const getMarketMap = vi.hoisted(() => vi.fn());
vi.mock("../lib/markets/get-market-map", () => ({ getMarketMap }));

// D82 (T68): the redirects plugin's collection with the save checks. The Local API is a fake that
// answers the market map with the seeded map (Cyprus at `/`, the US at `/us`, Germany at `/de`),
// the stored redirects, and the published pages and posts in every language.

type Stored = { id: number; from: string; type: string; to: Record<string, unknown> };

const state = {
  redirects: [] as Stored[],
  pages: [] as Record<string, unknown>[],
  posts: [] as Record<string, unknown>[],
};

const find = vi.fn(async ({ collection }: { collection: keyof typeof state }) => ({
  docs: state[collection],
}));

const warn = vi.fn();

const req = () =>
  ({
    locale: "en",
    fallbackLocale: "en",
    context: {},
    payload: { config: {}, find, logger: { warn } },
    t: (key: string) => key,
  }) as unknown as PayloadRequest;

const options = (data: Record<string, unknown>, id?: number, request = req()) =>
  ({ id, data, required: true, req: request }) as unknown as Parameters<typeof validateFrom>[1];

const custom = (url: string) => ({ type: "custom", url });
const page = (id: number) => ({ type: "reference", reference: { relationTo: "pages", value: id } });
const post = (id: number) => ({ type: "reference", reference: { relationTo: "posts", value: id } });

beforeEach(() => {
  state.redirects = [];
  state.pages = [];
  state.posts = [];
  find.mockClear();
  warn.mockClear();
  getMarketMap.mockReset().mockResolvedValue(seeded);
  revalidateTag.mockReset();
});

const collection = (): CollectionConfig => {
  const config = redirects({ collections: [] } as unknown as Config) as Config;
  return config.collections!.find((each) => each.slug === "redirects")!;
};
const named = (fields: readonly Field[], name: string) =>
  fields.find((field) => "name" in field && field.name === name);

describe("the redirects collection (D82)", () => {
  it("has from, to (a page, a post or a custom URL) and the type: 301, 302 or 308", () => {
    const { fields } = collection();
    expect(named(fields, "from")).toMatchObject({ unique: true, validate: validateFrom });
    const to = named(fields, "to");
    const reference = to && "fields" in to ? named(to.fields, "reference") : undefined;
    expect(reference).toMatchObject({ relationTo: ["pages", "posts"] });
    const url = to && "fields" in to ? named(to.fields, "url") : undefined;
    expect(url).toMatchObject({ validate: validateCustomUrl });
    const type = named(fields, "type");
    expect(
      type && "options" in type
        ? type.options.map((each) => (each as { value: string }).value)
        : [],
    ).toEqual(["301", "302", "308"]);
  });

  it("is written by staff only, and read by anyone, as /next/redirects publishes it", () => {
    const { access } = collection();
    const as = (user: unknown) => ({ req: { user } }) as never;
    const editor = { collection: "users", id: 2, role: "editor" };
    const sync = { collection: "integrations", id: 1, role: "medusa-sync" };
    for (const operation of ["create", "update", "delete"] as const) {
      expect(access?.[operation]?.(as(editor)), operation).toBe(true);
      expect(access?.[operation]?.(as(sync)), operation).toBe(false);
      expect(access?.[operation]?.(as(null)), operation).toBe(false);
    }
    expect(access?.read?.(as(null))).toBe(true);
  });

  it("expires /next/redirects' read on every save and delete, so the proxy's next read is new", async () => {
    const { hooks } = collection();
    const args = {
      collection: collection(),
      doc: { id: 1 },
      previousDoc: {},
      req: { ...req(), context: {} },
    };
    for (const hook of hooks?.afterChange ?? []) await hook(args as never);
    expect(revalidateTag).toHaveBeenCalledWith("redirects", { expire: 0 });
    revalidateTag.mockReset();
    for (const hook of hooks?.afterDelete ?? []) await hook({ ...args, id: 1 } as never);
    expect(revalidateTag).toHaveBeenCalledWith("redirects", { expire: 0 });
  });
});

describe("validateFrom", () => {
  it("runs Payload's own check first", async () => {
    expect(await validateFrom("", options({}))).toBe("validation:required");
  });

  it("refuses a path the proxy never sees, with the reason", async () => {
    expect(await validateFrom("/old.html", options({ to: custom("/new") }))).toMatch(/file/);
    expect(await validateFrom("/api/old", options({ to: custom("/new") }))).toMatch(/\/api/);
    expect(await validateFrom("/us", options({ to: custom("/new") }))).toMatch(/home/);
  });

  it("takes a redirect that goes somewhere else", async () => {
    state.redirects = [{ id: 1, from: "/older", type: "301", to: custom("/elsewhere") }];
    expect(await validateFrom("/old", options({ type: "301", to: custom("/new") }))).toBe(true);
  });

  it("refuses a redirect to itself, also through a page's address in one language", async () => {
    expect(await validateFrom("/old", options({ type: "301", to: custom("/old") }))).toMatch(
      /its own address/,
    );
    state.pages = [
      { id: 4, slug: { en: "about", el: "sxetika" }, title: { en: "About" }, parent: null },
    ];
    expect(await validateFrom("/sxetika", options({ type: "301", to: page(4) }))).toMatch(
      /its own address/,
    );
  });

  it("refuses a redirect to another redirect's from, and one from where another sends", async () => {
    state.redirects = [{ id: 1, from: "/new", type: "301", to: custom("/newer") }];
    expect(await validateFrom("/old", options({ type: "301", to: custom("/new") }))).toMatch(
      /which redirects too/,
    );
    expect(await validateFrom("/newer", options({ type: "301", to: custom("/x") }))).toMatch(
      /\/new already redirects to \/newer/,
    );
    // A post's address counts too: `/journal/<slug>` in the post's languages.
    state.posts = [{ id: 7, slug: { en: "spring" } }];
    state.redirects = [{ id: 1, from: "/journal/spring", type: "301", to: custom("/journal") }];
    expect(await validateFrom("/old", options({ type: "301", to: post(7) }))).toMatch(
      /which redirects too/,
    );
  });

  it("refuses a from another redirect has, spelled another way (PR 101 review, item 1)", async () => {
    state.redirects = [{ id: 1, from: "/old", type: "301", to: custom("/a") }];
    expect(await validateFrom("/old/", options({ type: "301", to: custom("/b") }))).toMatch(
      /\/old is the same address/,
    );
    // Also when the target cannot be worked out yet (a page with no published address).
    expect(await validateFrom("/old/", options({ type: "301", to: page(99) }))).toMatch(
      /same address/,
    );
  });

  it("does not count the stored copy of the redirect being saved", async () => {
    state.redirects = [{ id: 3, from: "/old", type: "301", to: custom("/new") }];
    expect(await validateFrom("/old", options({ type: "302", to: custom("/new") }, 3))).toBe(true);
  });

  it("puts back the request's locale after its reads (keepingRequest)", async () => {
    const request = req();
    find.mockImplementationOnce(async (args: { collection: keyof typeof state }) => {
      request.locale = "all";
      return { docs: state[args.collection] };
    });
    await validateFrom("/old", options({ type: "301", to: custom("/new") }, undefined, request));
    expect(request.locale).toBe("en");
  });
});

describe("validateCustomUrl", () => {
  it("takes a path inside the market or a full URL, and refuses a path with a market's prefix", async () => {
    const check = (url: string) => validateCustomUrl(url, options({}));
    expect(await check("/new")).toBe(true);
    expect(await check("https://other.example/new")).toBe(true);
    expect(await check("/de/neu")).toMatch(/without \/de/);
    expect(await check("new")).toMatch(/path inside the market/);
  });
});

// T75 review, items 2: a server that restarted while Medusa is down has no map to check against.
describe("when the market map can't be read (Medusa down, nothing read before)", () => {
  const down = () =>
    getMarketMap.mockRejectedValue(new Error("Medusa at http://localhost:9000 did not answer"));

  it("validateFrom refuses with a message for the field, and does not throw", async () => {
    down();
    const result = await validateFrom("/old", options({ type: "301", to: custom("/new") }));
    expect(result).toBe(MARKETS_UNREADABLE);
    expect(result).toMatch(/can't be read from Medusa/);
    // Nothing else was read for a check that cannot be made.
    expect(find).not.toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toMatch(/did not answer.*the redirect was refused/);
  });

  it("validateCustomUrl refuses with a message for the field, and does not throw", async () => {
    down();
    expect(await validateCustomUrl("/new", options({}))).toBe(MARKETS_UNREADABLE);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("Payload's own checks still come first, and Medusa coming back ends the refusal", async () => {
    down();
    expect(await validateFrom("", options({}))).toBe("validation:required");
    expect(await validateCustomUrl("", options({}))).toBe("validation:required");
    getMarketMap.mockResolvedValue(seeded);
    expect(await validateFrom("/old", options({ type: "301", to: custom("/new") }))).toBe(true);
    expect(await validateCustomUrl("/new", options({}))).toBe(true);
  });
});
