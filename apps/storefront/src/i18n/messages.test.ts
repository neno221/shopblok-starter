import { catalogs, LOCALES, type Messages } from "@shopblok/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pick, pickShell, SHELL_MESSAGES, type MessagePath } from "./messages";

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
