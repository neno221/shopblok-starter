import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const source = readFileSync(path.join(import.meta.dirname, "pagination.tsx"), "utf8");

function Pages(props: { onNavigate?: () => void; labels?: Partial<Record<string, string>> }) {
  const { labels = {}, onNavigate } = props;
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    onNavigate?.();
  };
  return (
    <Pagination label={labels.nav ?? "Pagination"}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            label={labels.previous ?? "Previous"}
            href="?page=1"
            onClick={onClick}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=1" aria-label="Page 1" onClick={onClick}>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=2" aria-label="Page 2" isActive onClick={onClick}>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis label={labels.more ?? "More pages"} />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=9" aria-label="Page 9" onClick={onClick}>
            9
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext label={labels.next ?? "Next"} href="?page=3" onClick={onClick} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is a navigation named by its required label", () => {
    render(<Pages />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
    // @ts-expect-error -- `label` is required: the kit's English "pagination" is gone (D30).
    render(<Pagination>x</Pagination>);
  });

  it("has no English text of its own: every string comes from a label", () => {
    render(
      <Pages
        labels={{
          nav: "Seitennummerierung",
          previous: "Zurück",
          next: "Weiter",
          more: "Weitere Seiten",
        }}
      />,
    );
    const text = document.body.textContent ?? "";
    for (const english of ["Previous", "Next", "More pages", "Go to"]) {
      expect(text).not.toContain(english);
    }
    expect(document.body.innerHTML).not.toMatch(/aria-label="(?:pagination|Go to [a-z ]+)"/);
    expect(screen.getByRole("link", { name: "Zurück" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Weiter" })).toBeTruthy();
    expect(screen.getByText("Weitere Seiten")).toBeTruthy();
  });

  it("requires `label` on previous, next and the ellipsis", () => {
    // @ts-expect-error -- `label` is required.
    render(<PaginationPrevious href="#" />);
    // @ts-expect-error -- `label` is required.
    render(<PaginationNext href="#" />);
    // @ts-expect-error -- `label` is required.
    render(<PaginationEllipsis />);
  });

  it("renders real links, not buttons: the anchors keep their role and href", () => {
    render(<Pages />);
    const links = within(screen.getByRole("navigation")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "?page=1",
      "?page=1",
      "?page=2",
      "?page=9",
      "?page=3",
    ]);
    expect(screen.queryByRole("button")).toBeNull();
    for (const link of links) {
      expect(link.getAttribute("role")).toBeNull();
      expect(link.getAttribute("tabindex")).toBeNull();
    }
  });

  it("makes every link at least 44 × 44 px (D32)", () => {
    render(<Pages />);
    const [previous, one, two, nine, next] = screen.getAllByRole("link");
    for (const link of [one, two, nine]) {
      expect(link?.className).toContain("size-11");
    }
    for (const link of [previous, next]) {
      expect(link?.className).toContain("min-h-11");
      expect(link?.className).toContain("min-w-11");
    }
    expect(document.querySelector("[data-slot=pagination-ellipsis]")?.className).toContain(
      "size-11",
    );
  });

  it("marks the current page with aria-current and a filled background", () => {
    render(<Pages />);
    const current = screen.getByRole("link", { name: "Page 2" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.getAttribute("data-active")).toBe("true");
    expect(current.className).toContain("bg-primary");
    const other = screen.getByRole("link", { name: "Page 1" });
    expect(other.getAttribute("aria-current")).toBeNull();
    expect(other.className).not.toContain("bg-primary");
  });

  it("is reached with Tab, link by link, in reading order, and Enter follows a link", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Pages onNavigate={onNavigate} />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      await user.tab();
      expect(document.activeElement).toBe(link);
      expect(link.className).toContain("focus-visible:ring-ring");
    }
    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("names the previous and next links by their visible text, shown from sm up and read out below it", () => {
    render(<Pages />);
    for (const name of ["Previous", "Next"]) {
      const link = screen.getByRole("link", { name });
      const text = within(link).getByText(name);
      expect(text.className).toContain("sr-only");
      expect(text.className).toContain("sm:not-sr-only");
      // The chevron is decoration.
      expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("points its chevrons along the reading direction, and pads on the logical side", () => {
    render(<Pages />);
    const previous = screen.getByRole("link", { name: "Previous" });
    const next = screen.getByRole("link", { name: "Next" });
    expect(previous.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
    expect(next.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
    expect(previous.className).toContain("ps-2!");
    expect(next.className).toContain("pe-2!");
    expect(previous.className + next.className).not.toMatch(/(?:^|\s)p[lr]-/);
  });

  it("reads the ellipsis out (the kit hid its own text), but not its icon", () => {
    render(<Pages />);
    const ellipsis = document.querySelector("[data-slot=pagination-ellipsis]");
    expect(ellipsis?.getAttribute("aria-hidden")).toBeNull();
    expect(within(ellipsis as HTMLElement).getByText("More pages").className).toContain("sr-only");
    expect(ellipsis?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws no dark variant and no tinted ring", () => {
    render(<Pages />);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
  });

  it.each(longLabels)(
    "takes a long %s label for previous and next without a clipping class",
    (_locale, strings) => {
      render(
        <Pages
          labels={{ previous: strings.action, next: strings.linkLabel, more: strings.hint }}
        />,
      );
      for (const name of [strings.action, strings.linkLabel]) {
        const link = screen.getByRole("link", { name });
        expect(link.className).not.toMatch(CLIPPING_CLASSES);
        expect(within(link).getByText(name).className).not.toMatch(CLIPPING_CLASSES);
      }
      expect(screen.getByText(strings.hint)).toBeTruthy();
    },
  );
});
