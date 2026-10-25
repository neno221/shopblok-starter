import { catalogs, LOCALES } from "@shopblok/i18n";
import { describe, expect, it } from "vitest";
import { pick, SHELL_MESSAGES, type MessagePath } from "./messages";

describe("pick", () => {
  it("returns a namespace whole and leaves every other one out", () => {
    const picked = pick(catalogs.en, ["molecules.cartLineItem"]);
    expect(picked).toEqual({ molecules: { cartLineItem: catalogs.en.molecules.cartLineItem } });
    expect(JSON.stringify(picked)).not.toContain("productCard");
    expect(Object.keys(picked)).toEqual(["molecules"]);
  });

  it("returns one message at its place in the tree", () => {
    expect(pick(catalogs.el, ["wiring.title"])).toEqual({
      wiring: { title: catalogs.el.wiring.title },
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
    expect(() => pick(catalogs.en, ["wiring.title.deeper" as MessagePath])).toThrow(
      "wiring.title.deeper",
    );
    expect(() => pick(catalogs.en, ["constructor" as MessagePath])).toThrow("constructor");
  });
});

describe("SHELL_MESSAGES", () => {
  it.each(LOCALES)("names messages that %s's catalog has", (locale) => {
    expect(() => pick(catalogs[locale], SHELL_MESSAGES)).not.toThrow();
  });

  it("is the error boundary's two lines and nothing of a molecule or an organism", () => {
    expect(pick(catalogs.en, SHELL_MESSAGES)).toEqual({
      wiring: {
        backendUnavailable: catalogs.en.wiring.backendUnavailable,
        backendHint: catalogs.en.wiring.backendHint,
      },
    });
  });
});
