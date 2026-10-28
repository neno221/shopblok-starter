import { catalogs, LOCALES, type Messages } from "@shopblok/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  codeMessages,
  pick,
  pickShell,
  SHELL_MESSAGES,
  uiStringOverrides,
  withOverrides,
  type MessagePath,
} from "./messages";

/** A catalog with the messages at `paths` removed: a language that has fallen behind. */
function without(messages: Messages, paths: string[]): Messages {
  const copy = structuredClone(messages) as unknown as Record<string, unknown>;
  for (const path of paths) {
    const keys = path.split(".");
    const last = keys.pop() ?? "";
    let held: Record<string, unknown> | undefined = copy;
    for (const key of keys) held = held?.[key] as Record<string, unknown> | undefined;
    if (held !== undefined) delete held[last];
  }
  return copy as unknown as Messages;
}

describe("pick", () => {
  it("returns a namespace whole and leaves every other one out", () => {
    const picked = pick(catalogs.en, ["molecules.cartLineItem"]);
    expect(picked).toEqual({
      molecules: { cartLineItem: catalogs.en.molecules.cartLineItem },
    });
    expect(JSON.stringify(picked)).not.toContain("productCard");
    expect(Object.keys(picked)).toEqual(["molecules"]);
  });

  it("returns one message at its place in the tree", () => {
    expect(pick(catalogs.el, ["templates.home.shopAll"])).toEqual({
      templates: { home: { shopAll: catalogs.el.templates.home.shopAll } },
    });
  });

  it("joins paths that share a parent, in any order, and a namespace with one of its messages", () => {
    const { cartLineItem, promoCodeField } = catalogs.de.molecules;
    const expected = { molecules: { cartLineItem, promoCodeField } };
    const paths: MessagePath[] = ["molecules.cartLineItem", "molecules.promoCodeField"];
    expect(pick(catalogs.de, paths)).toEqual(expected);
    expect(pick(catalogs.de, paths.toReversed())).toEqual(expected);
    expect(pick(catalogs.de, ["molecules.cartLineItem", "molecules.cartLineItem.remove"])).toEqual({
      molecules: { cartLineItem },
    });
    expect(pick(catalogs.de, ["molecules.cartLineItem.remove", "molecules.cartLineItem"])).toEqual({
      molecules: { cartLineItem },
    });
  });

  it("returns nothing for no paths", () => {
    expect(pick(catalogs.fr, [])).toEqual({});
  });

  it("copies what it returns, so a client component never holds the catalog's own object", () => {
    const picked = pick(catalogs.en, ["molecules.cartLineItem"]) as {
      molecules: { cartLineItem: Record<string, unknown> };
    };
    expect(picked.molecules.cartLineItem).not.toBe(catalogs.en.molecules.cartLineItem);
    picked.molecules.cartLineItem["remove"] = "changed";
    expect(catalogs.en.molecules.cartLineItem.remove).not.toBe("changed");
  });

  it("refuses a path that holds nothing, in any catalog", () => {
    expect(() => pick(catalogs.en, ["molecules.cartLineItems" as MessagePath])).toThrow(
      'there is no message at "molecules.cartLineItems"',
    );
    expect(() => pick(catalogs.en, ["templates.home.shopAll.deeper" as MessagePath])).toThrow(
      "templates.home.shopAll.deeper",
    );
    expect(() => pick(catalogs.en, ["constructor" as MessagePath])).toThrow("constructor");
  });
});

describe("pick with a fallback catalog (PR 70 review, item 2)", () => {
  it("reads a message the catalog lacks from the fallback, and says which", () => {
    const onFallback = vi.fn();
    const german = without(catalogs.de, ["templates.error.body"]);
    const picked = pick(german, SHELL_MESSAGES, {
      fallback: catalogs.en,
      onFallback,
    });
    expect(picked).toEqual({
      templates: {
        error: {
          ...catalogs.de.templates.error,
          title: catalogs.de.templates.error.title,
          body: catalogs.en.templates.error.body,
        },
      },
    });
    expect(onFallback.mock.calls).toEqual([["templates.error.body"]]);
  });

  it("fills a namespace key by key, so one missing line costs that line only", () => {
    const onFallback = vi.fn();
    const german = without(catalogs.de, ["molecules.cartLineItem.remove"]);
    const picked = pick(german, ["molecules.cartLineItem"], {
      fallback: catalogs.en,
      onFallback,
    });
    expect(picked).toEqual({
      molecules: {
        cartLineItem: {
          ...catalogs.de.molecules.cartLineItem,
          remove: catalogs.en.molecules.cartLineItem.remove,
        },
      },
    });
    expect(onFallback.mock.calls).toEqual([["molecules.cartLineItem.remove"]]);
  });

  it("takes the whole path from the fallback when a namespace is missing", () => {
    const onFallback = vi.fn();
    const german = without(catalogs.de, ["molecules.cartLineItem"]);
    expect(
      pick(german, ["molecules.cartLineItem"], {
        fallback: catalogs.en,
        onFallback,
      }),
    ).toEqual({
      molecules: { cartLineItem: catalogs.en.molecules.cartLineItem },
    });
    expect(onFallback.mock.calls).toEqual([["molecules.cartLineItem"]]);
  });

  it("does not call the fallback for a catalog that has everything, and copies what it returns", () => {
    const onFallback = vi.fn();
    const picked = pick(catalogs.fr, ["molecules.cartLineItem"], {
      fallback: catalogs.en,
      onFallback,
    }) as { molecules: { cartLineItem: Record<string, unknown> } };
    expect(onFallback).not.toHaveBeenCalled();
    expect(picked.molecules.cartLineItem).toEqual(catalogs.fr.molecules.cartLineItem);
    expect(picked.molecules.cartLineItem).not.toBe(catalogs.fr.molecules.cartLineItem);
  });

  it("still throws for a path that neither catalog has, and throws with no fallback at all", () => {
    const missing = ["templates.home.nothingHere" as MessagePath];
    expect(() => pick(catalogs.de, missing, { fallback: catalogs.en })).toThrow(
      'there is no message at "templates.home.nothingHere"',
    );
    const german = without(catalogs.de, ["templates.error.body"]);
    expect(() => pick(german, SHELL_MESSAGES)).toThrow(
      'there is no message at "templates.error.body"',
    );
  });
});

describe("pickShell", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(LOCALES)("needs no fallback for %s: its catalog has every shell message", (locale) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(pickShell(catalogs[locale], locale)).toEqual(pick(catalogs[locale], SHELL_MESSAGES));
    expect(warn).not.toHaveBeenCalled();
  });

  it("shows English for a shell message a language lacks, and warns once per language and path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const behind = without(catalogs.fr, ["templates.error.title"]);
    const expected = {
      templates: {
        error: {
          ...catalogs.fr.templates.error,
          title: catalogs.en.templates.error.title,
          body: catalogs.fr.templates.error.body,
        },
      },
    };
    expect(pickShell(behind, "fr")).toEqual(expected);
    expect(pickShell(behind, "fr")).toEqual(expected);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(
      'fr catalog has no message at "templates.error.title"',
    );

    // Another language is another warning.
    expect(pickShell(without(catalogs.el, ["templates.error.title"]), "el")).toEqual({
      templates: {
        error: {
          ...catalogs.el.templates.error,
          title: catalogs.en.templates.error.title,
          body: catalogs.el.templates.error.body,
        },
      },
    });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("SHELL_MESSAGES", () => {
  // Without a fallback: a language that lacks a shell message fails here, in CI, before it can reach
  // the layout (which then shows English and warns, rather than answering 500).
  it.each(LOCALES)("names messages that %s's catalog has", (locale) => {
    expect(() => pick(catalogs[locale], SHELL_MESSAGES)).not.toThrow();
  });

  it("is the error boundary's template and nothing of a molecule or an organism", () => {
    expect(pick(catalogs.en, SHELL_MESSAGES)).toEqual({
      templates: { error: catalogs.en.templates.error },
    });
  });
});

describe("uiStringOverrides (D77)", () => {
  const LOW = "atoms.stock.low";

  it("keeps an edited value that passes the ICU check against the code's English", () => {
    const value = "{count, plural, other {Μόνο # ακόμη}}";
    expect(uiStringOverrides("el", [{ key: LOW, value }])).toEqual({ [LOW]: value });
  });

  it("leaves out a value that is the code's, an empty one, and a key the code no longer has", () => {
    const warn = vi.fn();
    expect(
      uiStringOverrides(
        "el",
        [
          { key: LOW, value: catalogs.el.atoms.stock.low },
          { key: "atoms.stock.out", value: null },
          { key: "templates.error.body", value: "" },
          { key: "atoms.gone.message", value: "Gone" },
        ],
        warn,
      ),
    ).toEqual({});
    expect(warn).not.toHaveBeenCalled();
  });

  it("compares a language with no catalog with English's: Payload's English fallback is no edit", () => {
    expect(uiStringOverrides("pt", [{ key: LOW, value: catalogs.en.atoms.stock.low }])).toEqual({});
    expect(uiStringOverrides("pt", [{ key: LOW, value: "{count, plural, other {Só #}}" }])).toEqual(
      { [LOW]: "{count, plural, other {Só #}}" },
    );
  });

  it("keeps the language's catalog for an emptied value: the fallback's unedited English is no edit", () => {
    // PR 93 review, item 3: an emptied Greek value reads as the stored English (Payload's fallback).
    expect(uiStringOverrides("el", [{ key: LOW, value: catalogs.en.atoms.stock.low }])).toEqual({});
    const edited = "{count, plural, other {Just # left}}";
    expect(uiStringOverrides("el", [{ key: LOW, value: edited }])).toEqual({ [LOW]: edited });
  });

  it("falls back to the code for a value that fails the check, warning once per value", () => {
    const warn = vi.fn();
    const broken = [{ key: LOW, value: "Μόνο {total} ακόμη" }];
    expect(uiStringOverrides("de", broken, warn)).toEqual({});
    expect(uiStringOverrides("de", broken, warn)).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe(
      "ui-strings: the de value of \"atoms.stock.low\" is not used, the code's is. It must use the English text's arguments ({count, plural}): {count, plural} is missing; {total} is not one of them.",
    );
    expect(
      uiStringOverrides("de", [{ key: LOW, value: "{count, plural, other {#" }], warn),
    ).toEqual({});
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("knows the 718 shop messages of each catalog, without the design-system chrome", () => {
    for (const locale of LOCALES) expect(codeMessages(locale).size, locale).toBe(718);
    expect([...codeMessages("en").keys()].some((key) => key.startsWith("designSystem."))).toBe(
      false,
    );
  });
});

describe("withOverrides (D77)", () => {
  it("is the catalog itself when nothing is edited", () => {
    expect(withOverrides(catalogs.el, {})).toBe(catalogs.el);
  });

  it("puts each edited value at its path in a copy, and leaves the shared catalog as it was", () => {
    const before = structuredClone(catalogs.el);
    const merged = withOverrides(catalogs.el, { "templates.error.title": "Ωχ" });
    expect(merged.templates.error.title).toBe("Ωχ");
    expect(merged.templates.error.body).toBe(catalogs.el.templates.error.body);
    expect(merged).not.toBe(catalogs.el);
    expect(catalogs.el).toEqual(before);
  });

  it("never puts a string where the catalog has a namespace, or a path it does not have", () => {
    const merged = withOverrides(catalogs.en, {
      "templates.error": "flat",
      "templates.nothing.here": "x",
    });
    expect(merged.templates.error).toEqual(catalogs.en.templates.error);
    expect("nothing" in merged.templates).toBe(false);
  });
});
