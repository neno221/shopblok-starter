import type { Block, Field } from "payload";
import { describe, expect, it, vi } from "vitest";
import { BLOCKS } from "./blocks";
import { Pages } from "./collections/pages";
import {
  fieldAnchor,
  filled,
  gatherReads,
  readEveryLanguage,
  readManyInEveryLanguage,
  translationStatus,
} from "./translation-status";

// D107 (T89): the counts are over a document read in every language without the fallback, so each
// value below is `{ en, el, … }` as `locale: "all"` gives it.

const FAQ: Block = {
  slug: "faq",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    { name: "heading", type: "text", localized: true },
    { name: "variant", type: "select", options: ["list", "split"] },
    {
      name: "aside",
      type: "text",
      localized: true,
      admin: {
        condition: (_: unknown, sibling: { variant?: string }) => sibling.variant === "split",
      },
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "question", type: "text", localized: true },
        { name: "url", type: "text" },
      ],
    },
  ],
};

/** `localizedLayout`'s copy of the block, as Payload sanitizes it: no `localized` inside. */
const FAQ_COPY: Block = {
  ...FAQ,
  fields: [
    { name: "heading", type: "text" },
    { name: "variant", type: "select", options: ["list", "split"] },
    {
      name: "aside",
      type: "text",
      admin: {
        condition: (_: unknown, sibling: { variant?: string }) => sibling.variant === "split",
      },
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "question", type: "text" },
        { name: "url", type: "text" },
      ],
    },
  ],
};

const FIELDS: Field[] = [
  { name: "title", type: "text", localized: true, label: "Title" },
  { name: "code", type: "text" },
  { name: "layoutPerLanguage", type: "checkbox" },
  {
    name: "layout",
    type: "blocks",
    blocks: [],
    blockReferences: ["faq"],
    admin: { condition: (data) => data?.["layoutPerLanguage"] !== true },
  },
  {
    name: "localizedLayout",
    label: "Layout (this language)",
    type: "blocks",
    localized: true,
    blocks: [FAQ_COPY],
    admin: { condition: (data) => data?.["layoutPerLanguage"] === true },
  },
  { name: "breadcrumbs", type: "array", localized: true, admin: { readOnly: true }, fields: [] },
  { name: "secret", type: "text", localized: true, admin: { hidden: true } },
];

const lexical = (text: string) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: text === "" ? [] : [{ type: "text", text }] }],
  },
});

const status = (doc: Record<string, unknown>, fields: Field[] = FIELDS, languages = ["el", "de"]) =>
  translationStatus({ fields, doc, languages, blocks: [FAQ] });

describe("filled (D107)", () => {
  it("counts an empty text, an empty list and an emptied rich text as nothing", () => {
    expect(filled(null)).toBe(false);
    expect(filled("  ")).toBe(false);
    expect(filled([])).toBe(false);
    expect(filled(lexical(""))).toBe(false);
    expect(filled({ heading: null })).toBe(false);
    expect(filled(lexical("Hello"))).toBe(true);
    expect(filled({ root: { type: "root", children: [{ type: "upload", value: 3 }] } })).toBe(true);
    expect(filled("Hi")).toBe(true);
    expect(filled(7)).toBe(true);
  });
});

describe("translationStatus (D107)", () => {
  it("says what a language lacks, field by field, and a language with every text is complete", () => {
    const result = status({
      title: { en: "About", el: "Σχετικά", de: null },
      code: "x",
      layout: [
        {
          blockType: "faq",
          heading: { en: "Questions", el: null, de: null },
          variant: "list",
          items: [{ question: { en: "Why?", el: "Γιατί;", de: null }, url: "/a" }],
        },
      ],
      breadcrumbs: { en: [{ url: "/about" }] },
      secret: { en: "hidden" },
    });
    expect(result.texts).toBe(3);
    expect(result.languages).toEqual([
      {
        language: "el",
        state: "partial",
        missing: [{ path: "layout.0.heading", label: "Layout › FAQ 1 › Heading" }],
      },
      {
        language: "de",
        state: "not-started",
        missing: [
          { path: "title", label: "Title" },
          { path: "layout.0.heading", label: "Layout › FAQ 1 › Heading" },
          { path: "layout.0.items.0.question", label: "Layout › FAQ 1 › Items › 1 › Question" },
        ],
      },
    ]);
  });

  it("is complete once the language has the text, and English leaves out what it has not filled", () => {
    const result = status({
      title: { en: "About", el: "Σχετικά", de: "Über" },
      layout: [{ blockType: "faq", heading: { en: "", el: null }, variant: "list" }],
    });
    expect(result.texts).toBe(1);
    expect(result.languages.map((each) => each.state)).toEqual(["complete", "complete"]);
  });

  it("leaves out a field whose condition is off, as the form does", () => {
    const doc = (variant: string) => ({
      title: { en: "About", el: "Σχετικά" },
      layout: [{ blockType: "faq", variant, aside: { en: "Aside", el: null } }],
    });
    expect(status(doc("list"), FIELDS, ["el"]).languages[0]?.state).toBe("complete");
    expect(status(doc("split"), FIELDS, ["el"]).languages[0]?.missing).toEqual([
      { path: "layout.0.aside", label: "Layout › FAQ 1 › Aside" },
    ]);
  });

  it("with a layout per language counts the blocks each language draws, not the shared ones", () => {
    const english = [
      {
        blockType: "faq",
        heading: "Questions",
        variant: "list",
        items: [{ question: "Why?", url: "/why" }],
      },
    ];
    const result = status({
      title: { en: "About", el: "Σχετικά", de: "Über" },
      layoutPerLanguage: true,
      // The shared layout is not drawn: its untranslated heading does not count.
      layout: [{ blockType: "faq", heading: { en: "Old", el: null, de: null }, variant: "list" }],
      localizedLayout: {
        en: english,
        // Greek has blocks of its own (here with a block English has not): its own texts.
        el: [{ blockType: "faq", heading: "Ερωτήσεις", variant: "list" }],
        // German has none, so it draws English's, whose texts are all still to translate; the
        // URL is not a text (the shared block does not localize it).
      },
    });
    expect(result.texts).toBe(3);
    const [greek, german] = result.languages;
    expect(greek).toMatchObject({ state: "complete", missing: [] });
    expect(german).toMatchObject({
      state: "partial",
      missing: [
        { path: "localizedLayout", label: "Layout (this language) › FAQ 1 › Heading" },
        { path: "localizedLayout", label: "Layout (this language) › FAQ 1 › Items › 1 › Question" },
      ],
    });
  });

  it("counts a localized list's texts when the language has none of its own", () => {
    const fields: Field[] = [
      {
        name: "notes",
        type: "array",
        localized: true,
        fields: [
          { name: "note", type: "text" },
          { name: "size", type: "number" },
        ],
      },
      { name: "body", type: "richText", localized: true },
    ];
    const result = status(
      {
        notes: { en: [{ note: "Ships in 2 days", size: 3 }], el: [{ note: "Αποστολή", size: 3 }] },
        body: { en: lexical("Hello"), el: lexical(""), de: null },
      },
      fields,
    );
    expect(result.texts).toBe(2);
    expect(result.languages).toEqual([
      { language: "el", state: "partial", missing: [{ path: "body", label: "Body" }] },
      {
        language: "de",
        state: "not-started",
        missing: [
          { path: "notes", label: "Notes › 1 › Note" },
          { path: "body", label: "Body" },
        ],
      },
    ]);
  });

  it("walks tabs, named and not, and groups", () => {
    const fields: Field[] = [
      {
        type: "tabs",
        tabs: [
          { label: "General", fields: [{ name: "message", type: "text", localized: true }] },
          {
            name: "seo",
            label: "SEO",
            fields: [
              {
                name: "group",
                type: "group",
                fields: [{ name: "description", type: "textarea", localized: true }],
              },
            ],
          },
        ],
      },
    ];
    const result = status(
      { message: { en: "Hi" }, seo: { group: { description: { en: "About us" } } } },
      fields,
      ["el"],
    );
    expect(result.languages[0]?.missing).toEqual([
      { path: "message", label: "General › Message" },
      { path: "seo.group.description", label: "SEO › Group › Description" },
    ]);
  });

  it("has nothing to count when English has no text (the templates global, with no localized field)", () => {
    const result = status({ variant: "grid" }, [{ name: "variant", type: "text" }], ["el"]);
    expect(result).toEqual({
      texts: 0,
      languages: [{ language: "el", state: "complete", missing: [] }],
    });
    expect(status({}, [], []).texts).toBe(0);
  });

  it("names a Greek-less page's heading on the real pages config", () => {
    const result = translationStatus({
      fields: Pages.fields,
      doc: {
        title: { en: "Sale", el: "Εκπτώσεις" },
        slug: { en: "sale", el: "ekptoseis" },
        layoutPerLanguage: false,
        layout: [
          {
            blockType: "promoBanner",
            variant: "standard",
            heading: { en: "Half price", el: null },
          },
        ],
      },
      languages: ["el"],
      blocks: BLOCKS,
    });
    expect(result.languages[0]).toMatchObject({
      state: "partial",
      missing: [{ path: "layout.0.heading", label: expect.stringMatching(/Heading$/) }],
    });
  });

  it("gives Payload's id for a field's path", () => {
    expect(fieldAnchor("layout.0.heading")).toBe("field-layout__0__heading");
  });
});

describe("the reads (D107)", () => {
  it("reads once, in every language, without the fallback, as the editor", async () => {
    const payload = {
      findByID: vi.fn(async () => ({ id: 4 })),
      findGlobal: vi.fn(async () => ({ id: 1 })),
      find: vi.fn(async () => ({ docs: [{ id: 4 }, { id: 5 }] })),
    };
    const user = { id: 1 } as never;
    await readEveryLanguage(payload as never, { collection: "pages" }, 4, user);
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        id: 4,
        locale: "all",
        fallbackLocale: false,
        draft: true,
        overrideAccess: false,
        user,
      }),
    );
    await readEveryLanguage(payload as never, { global: "header" }, undefined, user);
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "header", locale: "all", fallbackLocale: false, user }),
    );
    expect(
      await readEveryLanguage(payload as never, { collection: "pages" }, undefined, user),
    ).toBeNull();
    await readManyInEveryLanguage(payload as never, "posts", [4, 5], user);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        where: { id: { in: [4, 5] } },
        locale: "all",
        fallbackLocale: false,
        pagination: false,
        overrideAccess: false,
        user,
      }),
    );
  });

  it("gathers a list page's rows into one read", async () => {
    const read = vi.fn(async (ids: (number | string)[]) => ids.map((id) => ({ id })));
    const load = gatherReads(read);
    const rows = await Promise.all([load(1), load(2), load(3)]);
    expect(rows).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith([1, 2, 3]);
    // A row asked for after the read started gets a read of its own.
    expect(await load(9)).toEqual({ id: 9 });
    expect(read).toHaveBeenCalledTimes(2);
  });
});
