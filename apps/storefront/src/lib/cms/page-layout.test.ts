import { describe, expect, it } from "vitest";
import type { Page } from "../../payload-types";
import { pageLayout } from "./page-layout";

const shared = [{ blockType: "spacer", id: "a" }] as unknown as Page["layout"];
const own = [{ blockType: "faq", id: "b" }] as unknown as Page["layout"];

describe("pageLayout (D105, T88)", () => {
  it("draws the shared layout while the switch is off, whatever the language has of its own", () => {
    expect(pageLayout({ layout: shared, localizedLayout: own })).toBe(shared);
    expect(pageLayout({ layout: shared, layoutPerLanguage: false, localizedLayout: own })).toBe(
      shared,
    );
  });

  it("draws the language's own layout while it is on, and never the shared one", () => {
    expect(pageLayout({ layout: shared, layoutPerLanguage: true, localizedLayout: own })).toBe(own);
    // A language with no blocks of its own and no English ones either: nothing, not the shared
    // blocks (the read's fallback already gave it English's, so this is a page with none at all).
    expect(pageLayout({ layout: shared, layoutPerLanguage: true, localizedLayout: null })).toEqual(
      [],
    );
  });

  it("is empty for a page with no blocks", () => {
    expect(pageLayout({ layout: null })).toEqual([]);
  });
});
