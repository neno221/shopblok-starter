import { describe, expect, it } from "vitest";
import { byGroup, defineEntries, entries, findEntry, GROUPS, variantsOf, type EntryInput } from ".";

const atom = (id: string, extra: Partial<EntryInput> = {}): EntryInput => ({
  id,
  group: "atoms",
  kind: "atom",
  label: id,
  ...extra,
});

describe("the registry (D40)", () => {
  it("lists M1's 8 foundations and 32 atoms, in the navigation's order", () => {
    expect(byGroup("foundations")).toHaveLength(8);
    expect(byGroup("atoms")).toHaveLength(32);
    expect(entries).toHaveLength(40);
    expect(entries.map((entry) => entry.id).slice(0, 2)).toEqual([
      "foundations/colors",
      "foundations/typography",
    ]);
    expect(entries.at(-1)?.id).toBe("atoms/flag");
  });

  it("gives every entry a unique `{group}/{slug}` id in a known group, and a label", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of entries) {
      expect(GROUPS, entry.id).toContain(entry.group);
      expect(entry.id, entry.id).toMatch(new RegExp(`^${entry.group}/[a-z0-9]+(-[a-z0-9]+)*$`));
      expect(entry.label.trim(), entry.id).not.toBe("");
    }
  });

  it("names the @shopblok/ui export of every atom, and none for a foundation", () => {
    for (const entry of byGroup("atoms")) {
      expect(entry.kind, entry.id).toBe("atom");
      expect(entry.component?.module, entry.id).toBe(`@shopblok/ui/${entry.id}`);
      expect(entry.component?.name, entry.id).toMatch(/^[A-Z][A-Za-z]+$/);
    }
    for (const entry of byGroup("foundations")) {
      expect(entry.kind, entry.id).toBe("foundation");
      expect(entry.component, entry.id).toBeUndefined();
    }
  });

  it("finds an entry by id, and nothing else", () => {
    expect(findEntry("atoms/button")?.label).toBe("Button");
    for (const id of [
      "",
      "atoms",
      "atoms/nope",
      "Atoms/button",
      "atoms/button/x",
      "frame/atoms/button",
    ])
      expect(findEntry(id), id).toBeUndefined();
  });
});

describe("defineEntries", () => {
  it("rejects a duplicate id", () => {
    expect(() => defineEntries([atom("atoms/a"), atom("atoms/a")])).toThrow(
      'registry: "atoms/a" is listed twice.',
    );
  });

  it("rejects an id that is not `{group}/{slug}` with a kebab-case slug", () => {
    for (const id of [
      "atoms",
      "atoms/",
      "atoms/A",
      "atoms/a_b",
      "atoms/a/b",
      "molecules/a",
      "atoms/-a",
    ])
      expect(() => defineEntries([atom(id)]), id).toThrow("is not");
  });

  it("rejects an entry without a label", () => {
    expect(() => defineEntries([atom("atoms/a", { label: " " })])).toThrow("has no label");
  });

  it("wants a family and a variant together, with a variant unique in its family", () => {
    expect(() => defineEntries([atom("atoms/a", { family: "card" })])).toThrow("both");
    expect(() => defineEntries([atom("atoms/a", { variant: "x" })])).toThrow("both");
    expect(() =>
      defineEntries([
        atom("atoms/a", { family: "card", variant: "x" }),
        atom("atoms/b", { family: "card", variant: "x" }),
      ]),
    ).toThrow('the variant "card/x" is listed twice');
    // The same variant in two families is two variants.
    expect(
      defineEntries([
        atom("atoms/a", { family: "card", variant: "x" }),
        atom("atoms/b", { family: "tile", variant: "x" }),
      ]),
    ).toHaveLength(2);
  });

  it("derives the thumbnail of a family member (D52), and of nothing else", () => {
    const [member, single] = defineEntries([
      {
        id: "organisms/header-classic",
        group: "organisms",
        kind: "organism",
        label: "Classic",
        family: "header",
        variant: "classic",
      },
      atom("atoms/a"),
    ]);
    expect(member?.thumbnail).toBe("/registry/organisms/header-classic.png");
    expect(single?.thumbnail).toBeUndefined();
    for (const entry of entries) expect(entry.thumbnail, entry.id).toBeUndefined();
  });
});

describe("variantsOf", () => {
  it("lists a family's variants as a Payload picker needs them (value, label, thumbnail)", () => {
    const list = defineEntries([
      {
        id: "headers-footers/header-classic",
        group: "headers-footers",
        kind: "organism",
        label: "Classic",
        family: "header",
        variant: "classic",
      },
      {
        id: "headers-footers/footer-minimal",
        group: "headers-footers",
        kind: "organism",
        label: "Minimal",
        family: "footer",
        variant: "minimal",
      },
      {
        id: "headers-footers/header-centered",
        group: "headers-footers",
        kind: "organism",
        label: "Centered",
        family: "header",
        variant: "centered",
      },
    ]);
    expect(variantsOf("header", list)).toEqual([
      {
        value: "classic",
        label: "Classic",
        thumbnail: "/registry/headers-footers/header-classic.png",
      },
      {
        value: "centered",
        label: "Centered",
        thumbnail: "/registry/headers-footers/header-centered.png",
      },
    ]);
    expect(variantsOf("nope", list)).toEqual([]);
    // M1's entries have no family yet.
    expect(variantsOf("header")).toEqual([]);
  });
});
