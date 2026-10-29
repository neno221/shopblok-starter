import { describe, expect, it } from "vitest";
import { describeArguments, messageArguments, messageProblem, messagesOf } from "./icu";

const REVIEWS = "{average} out of 5, {count, plural, one {# review} other {# reviews}}";

describe("messagesOf", () => {
  it("flattens a catalog to its messages by dotted path", () => {
    expect([...messagesOf({ atoms: { stock: { low: "a", out: "b" } }, top: "c" })]).toEqual([
      ["atoms.stock.low", "a"],
      ["atoms.stock.out", "b"],
      ["top", "c"],
    ]);
  });
});

describe("messageArguments", () => {
  it("names each argument with its kind, inside plurals and tags too", () => {
    expect(Object.fromEntries(messageArguments(REVIEWS))).toEqual({
      average: "argument",
      count: "plural",
    });
    expect(
      Object.fromEntries(
        messageArguments("<link>{n, number}</link> {when, date} {place, selectordinal, other {#}}"),
      ),
    ).toEqual({ link: "tag", n: "number", when: "date", place: "selectordinal" });
  });

  it("throws for a message that is not ICU", () => {
    expect(() => messageArguments("{count, plural, one {#}")).toThrow();
  });
});

describe("describeArguments", () => {
  it("lists them as an editor reads them, in name order", () => {
    expect(describeArguments(messageArguments(REVIEWS))).toBe("{average}, {count, plural}");
    expect(describeArguments(messageArguments("<b>Hi</b>"))).toBe("<b>");
    expect(describeArguments(messageArguments("Plain"))).toBe("");
  });
});

describe("messageProblem (D77)", () => {
  it("takes a translation with the source's arguments, in any order and wording", () => {
    expect(
      messageProblem(
        "{count, plural, one {# κριτική} other {# κριτικές}}, {average} στα 5",
        REVIEWS,
      ),
    ).toBeNull();
    expect(messageProblem("Hello", "Hi")).toBeNull();
  });

  it("refuses a value that does not parse, saying where", () => {
    expect(messageProblem("{count, plural, one {#}", REVIEWS)).toMatch(
      /^It is not a valid ICU message \([A-Z_]+ at character \d+\)\.$/,
    );
  });

  it("refuses a missing, an unknown or a changed argument, naming each", () => {
    expect(messageProblem("{average} von 5", REVIEWS)).toBe(
      "It must use the English text's arguments ({average}, {count, plural}): {count, plural} is missing.",
    );
    expect(messageProblem("{total} {average} {count, plural, other {#}}", REVIEWS)).toBe(
      "It must use the English text's arguments ({average}, {count, plural}): {total} is not one of them.",
    );
    expect(messageProblem("{average} {count}", REVIEWS)).toBe(
      "It must use the English text's arguments ({average}, {count, plural}): {count} should be {count, plural}.",
    );
    expect(messageProblem("{name}", "Plain")).toBe(
      "It must use the English text's arguments (none): {name} is not one of them.",
    );
  });

  it("refuses a value of spaces only, which would draw a blank label (PR 93 review, item 6)", () => {
    for (const blank of [" ", "   ", "\n\t"]) {
      expect(messageProblem(blank, "Remove")).toBe(
        "It is blank: write the text, or leave it empty for the code's.",
      );
    }
    expect(messageProblem(" Remove ", "Remove")).toBeNull();
  });

  it("checks only the syntax when the source itself does not parse", () => {
    expect(messageProblem("{anything}", "{broken")).toBeNull();
    expect(messageProblem("{broken", "{broken")).not.toBeNull();
  });
});
