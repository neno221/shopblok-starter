import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

const source = readFileSync(path.join(import.meta.dirname, "breadcrumb.tsx"), "utf8");

function Trail(props: { label?: string; more?: string; home?: string; page?: string }) {
  return (
    <Breadcrumb label={props.label ?? "Breadcrumb"}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">{props.home ?? "Home"}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis label={props.more ?? "More"} />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/shoes">Shoes</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{props.page ?? "Trail runner"}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is a navigation named by its required label, with an ordered list of items", () => {
    render(<Trail label="Brotkrumen" />);
    const nav = screen.getByRole("navigation", { name: "Brotkrumen" });
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    // The separators are decoration: only the four items are list items.
    expect(within(nav).getAllByRole("listitem")).toHaveLength(4);
    // @ts-expect-error -- `label` is required: the kit's English "breadcrumb" is gone (D30).
    render(<Breadcrumb>x</Breadcrumb>);
  });

  it("makes each link a 44 × 44 px target, not running text (D32)", () => {
    render(<Trail />);
    for (const name of ["Home", "Shoes"]) {
      const link = screen.getByRole("link", { name });
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("min-w-11");
      expect(link.className).toContain("inline-flex");
      expect(link.getAttribute("data-slot")).toBe("breadcrumb-link");
    }
  });

  it("is reached with Tab link by link and draws the ring at full strength (D35)", async () => {
    const user = userEvent.setup();
    render(<Trail />);
    await user.tab();
    const home = screen.getByRole("link", { name: "Home" });
    expect(document.activeElement).toBe(home);
    expect(home.className).toContain("focus-visible:ring-ring");
    expect(home.className).not.toMatch(/ring-[a-z-]+\/\d/);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Shoes" }));
  });

  it("marks the current page, and it is not a target", () => {
    render(<Trail />);
    const page = screen.getByText("Trail runner");
    expect(page.getAttribute("aria-current")).toBe("page");
    expect(page.className).not.toContain("min-h-11");
  });

  it("reads the ellipsis out through its required label (the kit hid its own text), not its icon", () => {
    render(<Trail more="Weitere Ebenen" />);
    const ellipsis = document.querySelector("[data-slot=breadcrumb-ellipsis]") as HTMLElement;
    expect(ellipsis.getAttribute("aria-hidden")).toBeNull();
    expect(ellipsis.getAttribute("role")).toBeNull();
    expect(within(ellipsis).getByText("Weitere Ebenen").className).toContain("sr-only");
    expect(ellipsis.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // @ts-expect-error -- `label` is required.
    render(<BreadcrumbEllipsis />);
  });

  it("has no English text of its own", () => {
    render(<Trail label="Fil d'Ariane" more="Plus" home="Accueil" page="Chaussure" />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\bMore\b/);
    expect(document.body.innerHTML).not.toContain('aria-label="breadcrumb"');
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeTruthy();
  });

  it("points its separators along the reading direction", () => {
    render(<Trail />);
    const separators = document.querySelectorAll("[data-slot=breadcrumb-separator]");
    expect(separators).toHaveLength(3);
    for (const separator of separators) {
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });

  it("takes a custom separator as it is, and renders a link as another element with `render`", () => {
    render(
      <Breadcrumb label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<a href="/custom" data-custom="yes" />}>Custom</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = screen.getByRole("link", { name: "Custom" });
    expect(link.getAttribute("data-custom")).toBe("yes");
    expect(link.className).toContain("min-h-11");
    expect(document.querySelector("[data-slot=breadcrumb-separator]")?.textContent).toBe("/");
  });

  it("draws no dark variant, no physical direction and no tinted ring", () => {
    render(<Trail />);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).not.toMatch(/(?:^|\s)(?:text-left|[ml][lr]-\d)/);
  });

  it.each(longLabels)(
    "lets a long %s link and page wrap: no clipping class",
    (_locale, strings) => {
      render(<Trail home={strings.linkLabel} page={strings.productName} />);
      const link = screen.getByRole("link", { name: strings.linkLabel });
      expect(link.className).not.toMatch(CLIPPING_CLASSES);
      expect(screen.getByText(strings.productName).className).not.toMatch(CLIPPING_CLASSES);
      const list = screen.getByRole("list");
      expect(list.className).toContain("flex-wrap");
      expect(list.className).toContain("wrap-break-word");
      expect(list.className).not.toMatch(CLIPPING_CLASSES);
    },
  );
});
