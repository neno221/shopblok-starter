import type { PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import { breadcrumbsOf, populateBreadcrumbs, resaveInEveryLanguage } from "./nested-pages";

type Page = {
  id: number;
  slug: Record<string, string>;
  title: Record<string, string>;
  parent: number | null;
  _status?: string;
};

/**
 * A request whose Local API reads `pages` as Payload does: in `req.locale`, English where the
 * language has none, and it sets `req.locale` (and `req.context`) to the call's, as Payload's
 * `createLocalReq` does on the request it is given.
 */
function fakeRequest(pages: Page[], locale = "en") {
  const req = { locale, fallbackLocale: "en", context: {} } as unknown as PayloadRequest;
  const take = (args: { locale?: string; context?: object }) => {
    if (args.locale !== undefined) req.locale = args.locale as never;
    if (args.context !== undefined) req.context = { ...req.context, ...args.context };
  };
  const read = (page: Page) => ({
    id: page.id,
    slug: page.slug[req.locale!] ?? page.slug["en"],
    title: page.title[req.locale!] ?? page.title["en"],
    parent: page.parent,
  });
  const update = vi.fn(async (args: { id: number; locale: string; context: object }) => {
    take(args);
    return {};
  });
  req.payload = {
    findByID: vi.fn(async (args: { id: number; locale?: string }) => {
      take(args);
      const page = pages.find((each) => each.id === args.id);
      return page === undefined ? null : read(page);
    }),
    find: vi.fn(
      async (args: {
        where: Record<string, { equals?: number; in?: number[] }>;
        locale: string;
      }) => {
        take(args);
        const { id, parent } = args.where;
        const docs = pages
          .filter((page) => (id ? page.id === id.equals : parent?.in?.includes(page.parent ?? -1)))
          .map((page) => ({ id: page.id, _status: page._status ?? "published", slug: page.slug }));
        return { docs };
      },
    ),
    update,
  } as unknown as PayloadRequest["payload"];
  return { req, update };
}

const PAGES: Page[] = [
  {
    id: 1,
    slug: { en: "about", el: "sxetika" },
    title: { en: "About", el: "Σχετικά" },
    parent: null,
  },
  { id: 2, slug: { en: "team" }, title: { en: "Team" }, parent: 1 },
  { id: 3, slug: { en: "jobs", el: "theseis" }, title: { en: "Jobs", el: "Θέσεις" }, parent: 2 },
  {
    id: 4,
    slug: { en: "draft", el: "proxeiro" },
    title: { en: "Draft" },
    parent: 1,
    _status: "draft",
  },
];

describe("breadcrumbsOf", () => {
  it("lists the parents, top level first, with each one's path in the language read", async () => {
    const { req } = fakeRequest(PAGES, "el");
    expect(
      await breadcrumbsOf(req, { id: 3, slug: "theseis", title: "Θέσεις", parent: 2 }),
    ).toEqual([
      { doc: 1, url: "/sxetika", label: "Σχετικά" },
      { doc: 2, url: "/sxetika/team", label: "Team" },
      { doc: 3, url: "/sxetika/team/theseis", label: "Θέσεις" },
    ]);
  });

  it("stops at a loop instead of running on", async () => {
    const loop: Page[] = [
      { id: 1, slug: { en: "a" }, title: { en: "A" }, parent: 2 },
      { id: 2, slug: { en: "b" }, title: { en: "B" }, parent: 1 },
    ];
    const { req } = fakeRequest(loop);
    expect(await breadcrumbsOf(req, { id: 1, slug: "a", title: "A", parent: 2 })).toHaveLength(2);
  });
});

describe("populateBreadcrumbs", () => {
  const run = (req: PayloadRequest, data: Record<string, unknown>, originalDoc?: object) =>
    (populateBreadcrumbs as unknown as (args: object) => Promise<Record<string, unknown>>)({
      data,
      originalDoc,
      req,
    });

  it("takes the slug being saved, and the stored one when a save leaves it out", async () => {
    const { req } = fakeRequest(PAGES, "el");
    const saved = await run(req, { slug: "omada", title: "Ομάδα" }, { id: 2, parent: 1 });
    expect(saved["breadcrumbs"]).toEqual([
      { doc: 1, url: "/sxetika", label: "Σχετικά" },
      { doc: 2, url: "/sxetika/omada", label: "Ομάδα" },
    ]);
    // A re-save in Greek of a page with no Greek slug: English's, as Greek reads it.
    const resaved = await run(req, {}, { id: 2, parent: 1 });
    expect((resaved["breadcrumbs"] as { url: string }[]).at(-1)?.url).toBe("/sxetika/team");
    expect(req.locale).toBe("el");
  });

  it("leaves a save in every language at once alone", async () => {
    const { req } = fakeRequest(PAGES, "all");
    expect(await run(req, { title: "x" }, { id: 2 })).toEqual({ title: "x" });
  });
});

describe("resaveInEveryLanguage", () => {
  const run = (req: PayloadRequest, args: Record<string, unknown>) =>
    (resaveInEveryLanguage as unknown as (args: object) => Promise<unknown>)({
      context: req.context,
      req,
      ...args,
    });
  const published = (id: number, slug: string, parent: number | null) => ({
    id,
    slug,
    parent,
    _status: "published",
  });

  it("re-saves a page in its other languages and the pages under it in all of theirs", async () => {
    const { req, update } = fakeRequest(PAGES, "en");
    await run(req, {
      operation: "update",
      doc: published(1, "about-us", null),
      previousDoc: published(1, "about", null),
    });
    expect(update.mock.calls.map(([args]) => [args.id, args.locale])).toEqual([
      [1, "el"],
      [2, "en"],
      [3, "en"],
      [3, "el"],
    ]);
    // Only breadcrumbs change: no data, published, and marked so these saves start no new round.
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: {},
      draft: false,
      context: { resavingBreadcrumbs: true },
    });
    // The request is the editing language's again for the hooks after this one.
    expect(req.locale).toBe("en");
    expect(req.context).toEqual({});
  });

  it("does nothing for a draft, an unchanged address, or its own re-saves", async () => {
    const { req, update } = fakeRequest(PAGES, "en");
    await run(req, {
      operation: "update",
      doc: { ...published(1, "about", null), _status: "draft" },
    });
    await run(req, {
      operation: "update",
      doc: published(1, "about", null),
      previousDoc: published(1, "about", null),
    });
    await run(req, {
      operation: "update",
      context: { resavingBreadcrumbs: true },
      doc: published(1, "new", null),
      previousDoc: published(1, "about", null),
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("re-saves after a move, and a new page in its own language for its id", async () => {
    const { req, update } = fakeRequest(PAGES, "en");
    await run(req, {
      operation: "update",
      doc: published(3, "jobs", 1),
      previousDoc: published(3, "jobs", 2),
    });
    expect(update.mock.calls.map(([args]) => [args.id, args.locale])).toEqual([[3, "el"]]);
    update.mockClear();
    await run(req, { operation: "create", doc: published(2, "team", 1), previousDoc: {} });
    expect(update.mock.calls.map(([args]) => [args.id, args.locale])).toEqual([
      [2, "en"],
      [3, "en"],
      [3, "el"],
    ]);
  });
});
