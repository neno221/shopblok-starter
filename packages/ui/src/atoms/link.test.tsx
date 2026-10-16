import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Link } from "./link";

describe("Link", () => {
  it("is a link to its href, named by its text", () => {
    render(<Link href="/size-guide">Size guide</Link>);
    const link = screen.getByRole("link", { name: "Size guide" });
    expect(link.getAttribute("href")).toBe("/size-guide");
    expect(link.getAttribute("rel")).toBeNull();
    expect(link.getAttribute("target")).toBeNull();
  });

  it("adds rel=noopener noreferrer when it opens a new tab, keeping the rel it was given", () => {
    render(
      <>
        <Link href="https://example.com" target="_blank">
          Elsewhere
        </Link>
        <Link href="https://example.com/b" target="_blank" rel="nofollow">
          Other
        </Link>
      </>,
    );
    expect(screen.getByRole("link", { name: "Elsewhere" }).getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
    const rel = screen.getByRole("link", { name: "Other" }).getAttribute("rel") ?? "";
    expect(rel.split(" ").sort()).toEqual(["nofollow", "noopener", "noreferrer"]);
  });

  it("says that it opens a new tab when it has a label for it", () => {
    render(
      <Link href="https://example.com" target="_blank" newTabLabel="Opens in a new tab">
        Elsewhere
      </Link>,
    );
    expect(screen.getByRole("link", { name: "Elsewhere (Opens in a new tab)" })).toBeTruthy();
  });

  it("passes aria-current through", () => {
    render(
      <Link href="/a" aria-current="page">
        Here
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Here" });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toContain("aria-[current=page]:font-semibold");
  });

  it("is a 44 px target when standalone, and only then", () => {
    render(
      <>
        <Link href="/a" variant="standalone">
          Standalone
        </Link>
        <Link href="/b">Inline</Link>
      </>,
    );
    expect(screen.getByRole("link", { name: "Standalone" }).className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "Inline" }).className).not.toContain("min-h-11");
  });

  it("is reached with Tab and draws the ring at full strength", async () => {
    const user = userEvent.setup();
    render(<Link href="/a">Here</Link>);
    await user.tab();
    const link = screen.getByRole("link", { name: "Here" });
    expect(document.activeElement).toBe(link);
    expect(link.className).toContain("focus-visible:ring-ring");
    expect(link.className).not.toContain("ring-ring/");
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(<Link href="/a">{strings.linkLabel}</Link>);
    const link = screen.getByRole("link", { name: strings.linkLabel });
    expect(link.className).not.toMatch(CLIPPING_CLASSES);
  });
});
