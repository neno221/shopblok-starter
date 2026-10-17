import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import type { Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SearchXIcon, ShoppingBagIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { EmptyState, type EmptyStateProps } from "./empty-state";

// `next/link` is replaced by an anchor that records the props it was given, so the test can see
// what reaches the router (the link's `prefetch`).
const linkProps = vi.hoisted(() => [] as { prefetch?: boolean | null; href?: unknown }[]);
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ prefetch, ...props }: { prefetch?: boolean | null; href: string }) => {
      linkProps.push({ prefetch, href: props.href });
      return React.createElement("a", props);
    },
  };
});

const source = readFileSync(path.join(import.meta.dirname, "empty-state.tsx"), "utf8");

const fixtures = (locale: Locale) => commerceFixtures[locale];

/** The empty-state sample of a listing whose filters match nothing, with a way out. */
function noMatch(locale: Locale = "en"): EmptyStateProps {
  return fixtures(locale).emptyStates.filters;
}

function setup(props: EmptyStateProps = noMatch()) {
  return render(<EmptyState {...props} />);
}

describe("EmptyState", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("has a heading with the title, a paragraph with the text, and a link with the action", () => {
    setup();
    const { title, text, action } = noMatch();
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(text as string).tagName).toBe("P");
    const link = screen.getByRole("link", { name: action?.label });
    expect(link.getAttribute("href")).toBe(action?.href);
  });

  it("makes the title an h2 unless given another level", () => {
    const first = setup();
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    first.unmount();
    for (const level of [3, 4, 5, 6] as const) {
      const { unmount } = render(<EmptyState {...noMatch()} headingLevel={level} />);
      expect(screen.getByRole("heading", { level }).textContent).toBe(noMatch().title);
      unmount();
    }
  });

  it("draws the title alone when there is nothing else", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(container.querySelector("p")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("[data-slot=empty-state-icon]")).toBeNull();
  });

  it("draws the title and the text without an action", () => {
    render(<EmptyState title="Nothing here" text="Come back soon." />);
    expect(screen.getByText("Come back soon.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  describe("the icon", () => {
    it("is a Lucide icon the caller names, hidden from assistive technology", () => {
      const { container } = render(<EmptyState {...noMatch()} icon={SearchXIcon} />);
      const icon = container.querySelector("[data-slot=empty-state-icon]") as HTMLElement;
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.querySelector("svg")).toBeTruthy();
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("comes before the title in reading order, and another icon is another drawing", () => {
      const { container } = render(<EmptyState {...noMatch()} icon={ShoppingBagIcon} />);
      const parts = [...(container.firstElementChild as HTMLElement).children];
      expect(parts[0]?.getAttribute("data-slot")).toBe("empty-state-icon");
      expect(within(parts[1] as HTMLElement).getByRole("heading")).toBeTruthy();
      const first = container.querySelector("svg")?.innerHTML;
      const other = render(
        <EmptyState {...noMatch()} icon={SearchXIcon} />,
      ).container.querySelector("svg")?.innerHTML;
      expect(first).not.toBe(other);
    });

    it("is left out without one, so the title leads", () => {
      const { container } = setup();
      expect(container.querySelector("[data-slot=empty-state-icon]")).toBeNull();
    });
  });

  describe("the action", () => {
    it("is a link drawn as a button: the primary Button's classes on an anchor, never role=button", () => {
      setup();
      const link = screen.getByRole("link", { name: noMatch().action?.label });
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("role")).toBeNull();
      expect(link.className).toContain("bg-primary");
      expect(link.className).toContain("text-primary-foreground");
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("is a 44 px target with the ring at full strength", () => {
      setup();
      const link = screen.getByRole("link");
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("focus-visible:ring-ring");
      expect(link.className).not.toMatch(/ring-[a-z-]+\/\d/);
    });

    it("is reached with Tab, and is the only stop", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link"));
      await user.tab();
      expect(document.activeElement).toBe(document.body);
    });

    it("passes `prefetch` on to its link, and leaves it unset otherwise", () => {
      linkProps.length = 0;
      const unset = setup();
      expect(linkProps.at(-1)).toEqual({ prefetch: undefined, href: noMatch().action?.href });
      unset.unmount();
      for (const prefetch of [false, true, null]) {
        const { unmount } = render(<EmptyState {...noMatch()} prefetch={prefetch} />);
        expect(linkProps.at(-1)?.prefetch).toBe(prefetch);
        unmount();
      }
    });

    it("keeps its full label as its name, and wraps it", () => {
      render(
        <EmptyState
          title="No results"
          action={{ label: "Browse all products in every category", href: "/us" }}
        />,
      );
      const link = screen.getByRole("link", { name: "Browse all products in every category" });
      expect(link.className).toContain("max-w-full");
      expect(link.className).not.toMatch(CLIPPING_CLASSES);
    });
  });

  it("has no English of its own: with only a title and a text, nothing else is drawn", () => {
    const { container } = render(<EmptyState title="Titel" text="Text" />);
    expect(container.textContent).toBe("TitelText");
    const withIcon = render(<EmptyState title="Titel" text="Text" icon={SearchXIcon} />);
    expect(withIcon.container.textContent).toBe("TitelText");
  });

  it.each(["en", "el", "de", "fr"] as const)("draws the %s sample in its own words", (locale) => {
    const { title, text, action } = noMatch(locale);
    render(<EmptyState {...noMatch(locale)} icon={SearchXIcon} />);
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(text as string)).toBeTruthy();
    expect(screen.getByRole("link", { name: action?.label }).getAttribute("href")).toBe(
      action?.href,
    );
  });

  it.each(longLabels)(
    "wraps a long %s title, text and action instead of cutting them",
    (_locale, strings) => {
      const { container } = render(
        <EmptyState
          title={strings.productName}
          text={strings.productDescription}
          action={{ label: strings.action, href: "/us" }}
          icon={SearchXIcon}
        />,
      );
      expect(screen.getByRole("heading", { name: strings.productName }).className).toContain(
        "wrap-anywhere",
      );
      expect(screen.getByText(strings.productDescription).className).toContain("wrap-anywhere");
      expect(screen.getByRole("link", { name: strings.action })).toBeTruthy();
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      // The column may shrink to the row, so a long word cannot widen the page.
      expect(
        container.querySelector("[data-slot=empty-state-title]")?.parentElement?.className,
      ).toContain("min-w-0");
    },
  );

  it("passes the container's own props on and merges the class", () => {
    const { container } = render(<EmptyState {...noMatch()} id="no-match" className="py-20" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.id).toBe("no-match");
    expect(root.className).toContain("py-20");
    expect(root.className).toContain("text-center");
  });

  it("draws no dark variant and no tinted ring", () => {
    setup({ ...noMatch(), icon: SearchXIcon } as EmptyStateProps);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
  });
});
