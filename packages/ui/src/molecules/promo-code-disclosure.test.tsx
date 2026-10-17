import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PromoCodeDisclosure } from "./promo-code-disclosure";

function tree(needsOpen: boolean, className?: string) {
  return (
    <PromoCodeDisclosure summary="Add a promotion code" needsOpen={needsOpen} className={className}>
      <label>
        Code <input defaultValue="" />
      </label>
    </PromoCodeDisclosure>
  );
}

const details = () => document.querySelector("details") as HTMLDetailsElement;

/** What a browser does when the shopper opens or closes the disclosure: set `open`, then `toggle`. */
function toggleTo(open: boolean) {
  details().open = open;
  fireEvent(details(), new Event("toggle"));
}

describe("PromoCodeDisclosure", () => {
  it("is a native <details> whose summary names it, and is closed unless it is needed", () => {
    render(tree(false));
    expect(details().tagName).toBe("DETAILS");
    expect(details().open).toBe(false);
    expect(details().querySelector("summary")?.textContent).toBe("Add a promotion code");
    // The summary is the first child, as <details> needs.
    expect(details().firstElementChild?.tagName).toBe("SUMMARY");
  });

  it("is open from the start when it is needed", () => {
    render(tree(true));
    expect(details().open).toBe(true);
    expect(screen.getByLabelText("Code")).toBeTruthy();
  });

  it("is open in the markup of a server, so it works before any script has run", () => {
    expect(renderToStaticMarkup(tree(true))).toMatch(/<details[^>]* open=""/);
    expect(renderToStaticMarkup(tree(false))).not.toMatch(/<details[^>]* open/);
  });

  it("is a 44 px target with a ring at full strength, and a chevron nobody reads", () => {
    render(tree(false));
    const summary = details().querySelector("summary") as HTMLElement;
    expect(summary.className).toContain("min-h-11");
    expect(summary.className).toContain("focus-visible:ring-ring");
    expect(summary.className).not.toMatch(/ring-ring\//);
    expect(summary.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // The browser's own marker is hidden (`list-none`, and WebKit's pseudo-element).
    expect(summary.className).toContain("list-none");
    expect(summary.className).toContain("[&::-webkit-details-marker]:hidden");
  });

  it("wraps a long summary rather than cutting it", () => {
    render(
      <PromoCodeDisclosure summary={"Aktionscode".repeat(12)} needsOpen={false}>
        x
      </PromoCodeDisclosure>,
    );
    expect(details().querySelector("summary span")?.className).toContain("wrap-anywhere");
    expect(details().innerHTML).not.toMatch(/truncate|whitespace-nowrap|line-clamp/);
  });

  it("merges the class and the chevron turns when it is open", () => {
    render(tree(false, "max-w-sm"));
    expect(details().className).toContain("max-w-sm");
    expect(details().className).toContain("group/promo");
    expect(details().querySelector("svg")?.getAttribute("class")).toContain(
      "group-open/promo:rotate-180",
    );
  });

  describe("the open state is the shopper's", () => {
    it("follows the shopper's opening and closing", () => {
      render(tree(false));
      toggleTo(true);
      expect(details().open).toBe(true);
      toggleTo(false);
      expect(details().open).toBe(false);
    });

    it("stays open when it is no longer needed: nothing but the shopper closes it", () => {
      // A code was applied: the field is empty again and there is no error, so `needsOpen`
      // goes false, and the form must not close under the focused Apply button.
      const { rerender } = render(tree(true));
      rerender(tree(false));
      expect(details().open).toBe(true);
    });

    it("opens when it becomes needed (an error after a try)", () => {
      const { rerender } = render(tree(false));
      rerender(tree(true));
      expect(details().open).toBe(true);
    });

    it("opens again for a new error after the shopper closed it", () => {
      const { rerender } = render(tree(false));
      rerender(tree(true));
      toggleTo(false);
      expect(details().open).toBe(false);
      // The same need again changes nothing: the shopper's choice stands.
      rerender(tree(true));
      expect(details().open).toBe(false);
      // The need going away and coming back is a new error.
      rerender(tree(false));
      expect(details().open).toBe(false);
      rerender(tree(true));
      expect(details().open).toBe(true);
    });

    it("stays closed through a rerender that changes nothing about the need", () => {
      const { rerender } = render(tree(false));
      rerender(tree(false));
      expect(details().open).toBe(false);
    });
  });
});
