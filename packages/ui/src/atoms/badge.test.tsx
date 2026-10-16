import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("is a span with its text", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("data-slot")).toBe("badge");
  });

  it("renders as a link when given one, with the hover and the full-strength ring", () => {
    render(<Badge render={<a href="/sale" />}>Sale</Badge>);
    const link = screen.getByRole("link", { name: "Sale" });
    expect(link.getAttribute("href")).toBe("/sale");
    expect(link.className).toContain("[a]:hover:bg-primary/80");
    expect(link.className).toContain("focus-visible:ring-ring");
  });

  it("draws destructive as a solid fill with its foreground token", () => {
    expect(badgeVariants({ variant: "destructive" })).toContain(
      "bg-destructive text-destructive-foreground",
    );
  });

  it.each(longLabels)("wraps a long %s text instead of cutting it", (_locale, strings) => {
    render(<Badge>{strings.action}</Badge>);
    const badge = screen.getByText(strings.action);
    expect(badge.className).not.toMatch(CLIPPING_CLASSES);
    expect(badge.className).toContain("min-h-5");
  });
});
