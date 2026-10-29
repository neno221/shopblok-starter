import { catalogs } from "@shopblok/i18n";
import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";
import {
  changeFor,
  codeStrings,
  seedUiStrings,
  type CodeString,
  type StoredString,
} from "./ui-strings";

const code = (values: Partial<CodeString["values"]> = {}): CodeString => ({
  key: "atoms.stock.low",
  namespace: "atoms",
  source: { message: "Only {count} left", arguments: "{count}" },
  values: {
    en: "Only {count} left",
    el: "Απομένουν {count}",
    de: "Nur noch {count}",
    fr: "Plus que {count}",
    ...values,
  },
});

/** A document exactly as the seed of `code()` left it. */
const stored = (overrides: Partial<StoredString> = {}): StoredString => {
  const { values, key, namespace, source } = code();
  return {
    id: 7,
    key,
    namespace,
    source,
    value: { ...values },
    seeded: { ...values },
    ...overrides,
  };
};

describe("codeStrings", () => {
  it("has every message of the code catalogs, 721, in the four languages, and no design-system chrome", () => {
    const strings = codeStrings();
    expect(strings).toHaveLength(721);
    expect(strings.some((string) => string.key.startsWith("designSystem."))).toBe(false);
    const low = strings.find((string) => string.key === "atoms.stock.low");
    expect(low).toEqual({
      key: "atoms.stock.low",
      namespace: "atoms",
      source: { message: catalogs.en.atoms.stock.low, arguments: "{count, plural}" },
      values: {
        en: catalogs.en.atoms.stock.low,
        el: catalogs.el.atoms.stock.low,
        de: catalogs.de.atoms.stock.low,
        fr: catalogs.fr.atoms.stock.low,
      },
    });
  });
});

describe("changeFor: the update rule (D77)", () => {
  it("changes nothing on a document as the seed left it", () => {
    expect(changeFor(code(), stored())).toBeNull();
  });

  it("gives a new release's message to a value that still is the previous seed's", () => {
    expect(changeFor(code({ el: "Μόνο {count}" }), stored())).toEqual({
      value: { el: "Μόνο {count}" },
      seeded: { el: "Μόνο {count}" },
    });
  });

  it("keeps an editor's value, also when the release changes the message", () => {
    const edited = stored({ value: { ...code().values, el: "Λίγα: {count}" } });
    expect(changeFor(code(), edited)).toBeNull();
    expect(changeFor(code({ el: "Μόνο {count}" }), edited)).toBeNull();
  });

  it("fills an empty value", () => {
    const empty = stored({ value: { ...code().values, de: null, fr: "" } });
    expect(changeFor(code(), empty)).toEqual({
      value: { de: "Nur noch {count}", fr: "Plus que {count}" },
      seeded: { de: "Nur noch {count}", fr: "Plus que {count}" },
    });
  });

  it("moves only `seeded` on where the editor's value has become the code's", () => {
    const caughtUp = stored({ value: { ...code().values, el: "Μόνο {count}" } });
    expect(changeFor(code({ el: "Μόνο {count}" }), caughtUp)).toEqual({
      seeded: { el: "Μόνο {count}" },
    });
  });

  it("keeps the source and the namespace as the code has them", () => {
    const changed = code();
    changed.source = { message: "Just {count} left", arguments: "{count}" };
    expect(changeFor(changed, stored({ namespace: "old" }))).toEqual({
      namespace: "atoms",
      source: changed.source,
    });
  });
});

/** A Local API that keeps `ui-strings` in memory, in every language, and counts its writes. */
function fakePayload(initial: StoredString[] = []) {
  const docs = new Map(initial.map((doc) => [doc.id, structuredClone(doc)]));
  let next = 100;
  const merge = (target: Record<string, unknown>, data: Record<string, unknown>) => {
    for (const [field, value] of Object.entries(data)) {
      const held = target[field];
      target[field] =
        field === "value" || field === "seeded"
          ? { ...(held as object), ...(value as object) }
          : value;
    }
  };
  const payload = {
    find: vi.fn(async () => ({ docs: [...docs.values()].map((doc) => structuredClone(doc)) })),
    create: vi.fn(async ({ data }: { data: StoredString }) => {
      const doc = { ...structuredClone(data), id: next++ };
      docs.set(doc.id, doc);
      return doc;
    }),
    update: vi.fn(async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const doc = docs.get(id) as unknown as Record<string, unknown>;
      merge(doc, data);
      return doc;
    }),
    delete: vi.fn(async ({ where }: { where: { id: { in: number[] } } }) => {
      const gone = where.id.in.filter((id) => docs.delete(id));
      return { docs: gone.map((id) => ({ id })) };
    }),
  };
  return { payload: payload as unknown as Payload & typeof payload, docs };
}

describe("seedUiStrings", () => {
  it("creates every key in all four languages in one call each, then writes nothing on a second run", async () => {
    const { payload, docs } = fakePayload();
    const strings = codeStrings();
    expect(await seedUiStrings(payload, strings)).toEqual({
      created: 721,
      updated: 0,
      unchanged: 0,
      deleted: 0,
    });
    expect(payload.create).toHaveBeenCalledTimes(721);
    const call = payload.create.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(call).toMatchObject({ locale: "all", overrideAccess: true });
    expect(call["context"]).toEqual({ disableRevalidate: true });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "all", pagination: false, overrideAccess: true }),
    );
    expect(docs.size).toBe(721);

    payload.create.mockClear();
    expect(await seedUiStrings(payload, strings)).toEqual({
      created: 0,
      updated: 0,
      unchanged: 721,
      deleted: 0,
    });
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.delete).not.toHaveBeenCalled();
  });

  it("keeps an editor's value across a second run (pnpm bootstrap twice)", async () => {
    const { payload, docs } = fakePayload();
    const strings = [code()];
    await seedUiStrings(payload, strings);
    const doc = [...docs.values()][0] as StoredString;
    doc.value = { ...doc.value, el: "Λίγα: {count}" };
    expect(await seedUiStrings(payload, strings)).toMatchObject({ unchanged: 1, updated: 0 });
    expect(doc.value?.el).toBe("Λίγα: {count}");
  });

  it("deletes the keys the code no longer has, and adds the new ones", async () => {
    const gone = stored({ id: 9, key: "atoms.old.thing" });
    const { payload, docs } = fakePayload([stored(), gone]);
    const added = { ...code(), key: "atoms.stock.new" };
    expect(await seedUiStrings(payload, [code(), added])).toEqual({
      created: 1,
      updated: 0,
      unchanged: 1,
      deleted: 1,
    });
    expect(payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [9] } }, overrideAccess: true }),
    );
    expect([...docs.values()].map((doc) => doc.key).sort()).toEqual([
      "atoms.stock.low",
      "atoms.stock.new",
    ]);
  });

  it("updates a document only with what changeFor says, in every language at once", async () => {
    const { payload } = fakePayload([stored()]);
    expect(await seedUiStrings(payload, [code({ fr: "Encore {count}" })])).toMatchObject({
      updated: 1,
    });
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        locale: "all",
        data: { value: { fr: "Encore {count}" }, seeded: { fr: "Encore {count}" } },
      }),
    );
  });
});
