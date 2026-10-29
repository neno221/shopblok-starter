import { describe, expect, it } from "vitest";
import {
  MAX_PAGE_DEPTH,
  encodePagePath,
  pageAncestors,
  pagePath,
  pagePaths,
  pathFromSegments,
  type PageNode,
} from "./page-path";

describe("pagePath", () => {
  it("joins the slugs, top level first", () => {
    expect(pagePath(["about"])).toBe("/about");
    expect(pagePath(["about", "team"])).toBe("/about/team");
  });

  it("is null while a slug is missing", () => {
    expect(pagePath([])).toBeNull();
    expect(pagePath(["about", null])).toBeNull();
    expect(pagePath(["", "team"])).toBeNull();
  });
});

describe("pagePaths", () => {
  const nodes: PageNode[] = [
    { id: 1, slug: "sxetika", title: "Σχετικά", parent: null },
    { id: 2, slug: "team", title: "Team", parent: 1 },
    { id: 3, slug: "jobs", title: "Jobs", parent: { id: 2 } },
    { id: 4, slug: "privacy", title: "Privacy" },
  ];

  it("gives every page its address, both ways", () => {
    expect(pagePaths(nodes)).toEqual({
      byPath: { "/sxetika": 1, "/sxetika/team": 2, "/sxetika/team/jobs": 3, "/privacy": 4 },
      byId: {
        "1": { path: "/sxetika", title: "Σχετικά", parent: null },
        "2": { path: "/sxetika/team", title: "Team", parent: 1 },
        "3": { path: "/sxetika/team/jobs", title: "Jobs", parent: 2 },
        "4": { path: "/privacy", title: "Privacy", parent: null },
      },
    });
  });

  it("gives none to a page under one that cannot be read, or to the pages under it", () => {
    const paths = pagePaths(nodes.filter((node) => node.id !== 1));
    expect(Object.keys(paths.byId)).toEqual(["4"]);
  });

  it("lists a page's parents, top level first", () => {
    const paths = pagePaths(nodes);
    expect(pageAncestors(paths, 3).map(({ id, path }) => [id, path])).toEqual([
      [1, "/sxetika"],
      [2, "/sxetika/team"],
    ]);
    expect(pageAncestors(paths, 4)).toEqual([]);
    expect(pageAncestors(paths, 99)).toEqual([]);
  });

  it("gives none to a loop or a chain deeper than the limit", () => {
    expect(
      pagePaths([
        { id: 1, slug: "a", parent: 2 },
        { id: 2, slug: "b", parent: 1 },
      ]),
    ).toEqual({ byPath: {}, byId: {} });
    const chain = Array.from({ length: MAX_PAGE_DEPTH + 1 }, (_, index) => ({
      id: index + 1,
      slug: `p${index}`,
      parent: index === 0 ? null : index,
    }));
    const paths = pagePaths(chain);
    expect(paths.byId[String(MAX_PAGE_DEPTH)]).toBeDefined();
    expect(paths.byId[String(MAX_PAGE_DEPTH + 1)]).toBeUndefined();
  });

  it("gives an address to the first of two pages that read the same one", () => {
    const paths = pagePaths([
      { id: 7, slug: "about" },
      { id: 8, slug: "about" },
    ]);
    expect(paths.byPath).toEqual({ "/about": 7 });
    expect(paths.byId["8"]).toBeUndefined();
  });
});

describe("encodePagePath", () => {
  it("percent-encodes each slug and keeps the slashes", () => {
    expect(encodePagePath("/σχετικά/team")).toBe(
      "/%CF%83%CF%87%CE%B5%CF%84%CE%B9%CE%BA%CE%AC/team",
    );
    expect(pathFromSegments(encodePagePath("/σχετικά/team").split("/").slice(1))).toBe(
      "/σχετικά/team",
    );
  });
});

describe("pathFromSegments", () => {
  it("decodes what Next hands over encoded, and takes it as it is otherwise", () => {
    expect(pathFromSegments(["%CF%83%CF%87%CE%B5%CF%84%CE%B9%CE%BA%CE%AC", "team"])).toBe(
      "/σχετικά/team",
    );
    expect(pathFromSegments(["σχετικά"])).toBe("/σχετικά");
  });

  it("is null for nothing or a broken encoding", () => {
    expect(pathFromSegments([])).toBeNull();
    expect(pathFromSegments(["%E0%A4%A"])).toBeNull();
  });
});
