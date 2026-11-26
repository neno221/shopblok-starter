import { describe, expect, it } from "vitest";
import { routeType, summarize, table } from "./csp-inventory";

describe("routeType", () => {
  it("names a page by its first segment after the market's prefix", () => {
    expect(routeType("/")).toBe("home");
    expect(routeType("/us")).toBe("home");
    expect(routeType("/ch/fr")).toBe("home");
    expect(routeType("/us/products/hoodie")).toBe("products");
    expect(routeType("/products/hoodie")).toBe("products");
    expect(routeType("/ch/fr/store")).toBe("store");
  });

  it("keeps the design system, the admin and /next as they are", () => {
    expect(routeType("/design-system/en/atoms")).toBe("design-system");
    expect(routeType("/admin/collections/pages")).toBe("admin");
    expect(routeType("/next/status")).toBe("next");
  });
});

describe("summarize", () => {
  const site = "http://localhost:8000";
  const lines = [
    { spec: "a", route: "checkout", origin: site, type: "script", frame: false },
    { spec: "a", route: "checkout", origin: "https://js.stripe.com", type: "script", frame: false },
    {
      spec: "a",
      route: "checkout",
      origin: "https://js.stripe.com",
      type: "document",
      frame: true,
    },
    { spec: "a", route: "home", origin: "data:", type: "image", frame: false },
    {
      spec: "a",
      route: "home",
      violation: "enforce script-src-elem blocked https://x.example/x.js",
    },
  ]
    .map((line) => JSON.stringify(line))
    .join("\n");

  it("sorts each route's foreign and own requests, frames and violations", () => {
    expect(summarize(`${lines}\n\n`, site)).toEqual([
      {
        route: "checkout",
        foreign: ["frame https://js.stripe.com", "script https://js.stripe.com"],
        own: ["script"],
        violations: [],
      },
      {
        route: "home",
        foreign: [],
        own: ["image data:"],
        violations: ["enforce script-src-elem blocked https://x.example/x.js"],
      },
    ]);
  });

  it("prints a Markdown table, with none for an empty cell", () => {
    const text = table(summarize(lines, site));
    expect(text.split("\n")[0]).toBe("| Route type | Foreign origins | Same origin | Violations |");
    expect(text).toContain(
      "| `checkout` | frame https://js.stripe.com, script https://js.stripe.com | script | none |",
    );
  });
});
