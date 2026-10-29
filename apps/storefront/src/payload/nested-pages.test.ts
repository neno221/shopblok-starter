import type { PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  breadcrumbsOf,
  keepPageWithChildren,
  nestedPageFields,
  populateBreadcrumbs,
  resaveInEveryLanguage,
  validateParent,
} from "./nested-pages";

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

type Stored = {
  id: number;
  slug: Record<string, string>;
  /** The published page's parent. */
  parent: number | null;
  /** The latest version's, when an editor's draft moved it. */
  draftParent?: number | null;
};

/** The pages as the guards read them: published, latest versions, and slugs in each language. */
function guardRequest(pages: Stored[], locale = "en", context: object = {}) {
  const parentIn = (page: Stored, draft: boolean) =>
    draft && page.draftParent !== undefined ? page.draftParent : page.parent;
  const req = {
    locale,
    fallbackLocale: "en",
    context,
    t: (key: string) => key,
  } as unknown as PayloadRequest;
  req.payload = {
    collections: {},
    db: { defaultIDType: "number" },
    findByID: vi.fn(async (args: { id: number; draft?: boolean }) => {
      const page = pages.find((each) => each.id === args.id);
      return page === undefined ? null : { parent: parentIn(page, args.draft === true) };
    }),
    find: vi.fn(
      async (args: {
        where: Record<string, { equals?: number; in?: number[] }>;
        draft?: boolean;
      }) => {
        const { id, parent } = args.where;
        const draft = args.draft === true;
        const docs = pages
          .filter((page) =>
            id
              ? page.id === id.equals
              : parent?.in
                ? parent.in.includes(parentIn(page, draft) ?? -1)
                : parentIn(page, draft) === parent?.equals,
          )
          .map((page) => ({ id: page.id, _status: "published", slug: page.slug }));
        return { docs };
      },
    ),
    count: vi.fn(
      async (args: {
        where: {
          and: Record<string, { equals?: unknown; exists?: boolean; not_equals?: number }>[];
        };
        locale: string;
      }) => {
        const [slug, parent, id] = args.where.and;
        const totalDocs = pages.filter(
          (page) =>
            page.slug[args.locale] === slug?.["slug"]?.equals &&
            (parent?.["parent"]?.exists === false
              ? page.parent === null
              : page.parent === parent?.["parent"]?.equals) &&
            page.id !== id?.["id"]?.not_equals,
        ).length;
        return { totalDocs };
      },
    ),
  } as unknown as PayloadRequest["payload"];
  return req;
}

describe("validateParent (PR 98 review, items 3 and 5)", () => {
  const TREE: Stored[] = [
    { id: 1, slug: { en: "about", el: "sxetika" }, parent: null },
    { id: 2, slug: { en: "team", el: "el" }, parent: 1 },
    { id: 3, slug: { en: "jobs" }, parent: 2 },
    { id: 4, slug: { en: "contact", el: "epafi" }, parent: null },
  ];
  const check = (
    value: number | null,
    { id, previous, req }: { id?: number; previous?: number | null; req: PayloadRequest },
  ) =>
    validateParent(value, {
      id,
      req,
      event: "submit",
      relationTo: "pages",
      previousValue: previous,
      data: {},
      siblingData: {},
    } as unknown as Parameters<typeof validateParent>[1]);

  it("is the parent field's check", () => {
    const [parent] = nestedPageFields();
    expect(parent).toMatchObject({ name: "parent", validate: validateParent });
  });

  it("refuses a page under itself or under one of its own pages", async () => {
    const req = guardRequest(TREE);
    expect(await check(1, { id: 1, previous: null, req })).toMatch(/under itself/);
    expect(await check(3, { id: 1, previous: null, req })).toMatch(/under itself/);
    expect(await check(4, { id: 1, previous: null, req })).toBe(true);
  });

  it("refuses a loop an editor's draft would make when it is published", async () => {
    // Page 4's latest version is under 1; 1 under 4 would be a loop once both are published.
    const req = guardRequest(
      TREE.map((page) => (page.id === 4 ? { ...page, draftParent: 1 } : page)),
    );
    expect(await check(4, { id: 1, previous: null, req })).toMatch(/under itself/);
  });

  it("keeps the page and the pages under it within ten levels", async () => {
    const chain: Stored[] = Array.from({ length: 9 }, (_, index) => ({
      id: 10 + index,
      slug: { en: `level-${index + 1}` },
      parent: index === 0 ? null : 9 + index,
    }));
    const req = guardRequest([...TREE, ...chain]);
    // Under the ninth level: the tenth, allowed; a page with pages under it would go deeper.
    expect(await check(18, { req })).toBe(true);
    expect(await check(18, { id: 4, previous: null, req })).toBe(true);
    expect(await check(18, { id: 1, previous: null, req })).toMatch(/at most 10 deep/);
  });

  it("checks a moved page's slugs in its other languages, naming the language", async () => {
    const req = guardRequest(TREE, "en");
    // Page 2's Greek slug, two letters, is allowed under a parent and not at the top level.
    expect(await check(null, { id: 2, previous: 1, req })).toMatch(
      /In Ελληνικά \(el\), the slug "el".*market's address/,
    );
    expect(await check(4, { id: 2, previous: 1, req })).toBe(true);
    // Under page 4 beside a page that has the Greek slug already.
    const taken = guardRequest([...TREE, { id: 5, slug: { en: "x", el: "el" }, parent: 4 }]);
    expect(await check(4, { id: 2, previous: 1, req: taken })).toMatch(/another page's here/);
    // Not moved: nothing more to check.
    expect(await check(1, { id: 2, previous: 1, req })).toBe(true);
  });

  it("checks a move saved as a draft when it is published", async () => {
    // The latest version is at the top level already; the published page is under 1.
    const req = guardRequest(TREE);
    expect(await check(null, { id: 2, previous: null, req })).toMatch(/In Ελληνικά \(el\)/);
  });

  it("checks nothing more while the editor types, or on its own re-saves", async () => {
    const typing = await validateParent(1, {
      id: 1,
      req: guardRequest(TREE),
      event: "onChange",
      relationTo: "pages",
    } as unknown as Parameters<typeof validateParent>[1]);
    expect(typing).toBe(true);
    const req = guardRequest(TREE, "en", { resavingBreadcrumbs: true });
    expect(await check(1, { id: 1, previous: null, req })).toBe(true);
  });
});

describe("keepPageWithChildren (PR 98 review, item 2)", () => {
  const run = (req: PayloadRequest, id: number) =>
    (keepPageWithChildren as unknown as (args: object) => Promise<unknown>)({ id, req });

  it("refuses to delete a page with pages under it, published or in a draft", async () => {
    const pages: Stored[] = [
      { id: 1, slug: { en: "about" }, parent: null },
      { id: 2, slug: { en: "team" }, parent: 1 },
      { id: 3, slug: { en: "jobs" }, parent: null, draftParent: 4 },
      { id: 4, slug: { en: "contact" }, parent: null },
      { id: 5, slug: { en: "faq" }, parent: null },
    ];
    await expect(run(guardRequest(pages), 1)).rejects.toThrow(/a page under it/);
    await expect(run(guardRequest(pages), 4)).rejects.toThrow(/a page under it/);
    await expect(run(guardRequest(pages), 5)).resolves.toBeUndefined();
  });
});
