// @vitest-environment happy-dom
import { pageFixtures } from "@shopblok/fixtures";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getRecentlyViewed,
  isStoredCard,
  MAX_RECENTLY_VIEWED,
  rememberViewed,
  resetRecentlyViewed,
} from "./recently-viewed";

const [card] = pageFixtures.en.productDetail.related?.products ?? [];
if (card === undefined) throw new Error("the fixtures have no related cards");
const KEY = "shopblok:recently-viewed";

beforeEach(() => {
  window.localStorage.clear();
  resetRecentlyViewed();
});

describe("recently viewed (D61)", () => {
  it("keeps the newest first, once, per market, nine at most", () => {
    for (let index = 0; index < 12; index += 1)
      rememberViewed("en-us", { ...card, id: `prod_${index}` });
    rememberViewed("en-us", { ...card, id: "prod_3" });
    const list = getRecentlyViewed("en-us");
    expect(list).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(list[0]?.id).toBe("prod_3");
    expect(list.filter((each) => each.id === "prod_3")).toHaveLength(1);
    expect(getRecentlyViewed("el-cy")).toEqual([]);
  });

  it("gives the same array until the list changes", () => {
    rememberViewed("en-us", card);
    expect(getRecentlyViewed("en-us")).toBe(getRecentlyViewed("en-us"));
  });

  it("drops a stored card whose link or picture is not this site's", () => {
    expect(isStoredCard(card)).toBe(true);
    expect(isStoredCard({ ...card, href: "javascript:alert(1)" })).toBe(false);
    expect(isStoredCard({ ...card, href: "//evil.example/x" })).toBe(false);
    expect(
      isStoredCard({
        ...card,
        images: [{ ...card.images[0], src: "javascript:x" }],
      }),
    ).toBe(false);
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        "en-us": [card, { ...card, id: "bad", href: "javascript:x" }, 42],
      }),
    );
    resetRecentlyViewed();
    expect(getRecentlyViewed("en-us").map((each) => each.id)).toEqual([card.id]);
  });

  it("reads broken storage as nothing", () => {
    window.localStorage.setItem(KEY, "{not json");
    resetRecentlyViewed();
    expect(getRecentlyViewed("en-us")).toEqual([]);
  });
});
