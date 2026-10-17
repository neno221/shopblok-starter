import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SearchIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";

const source = readFileSync(path.join(import.meta.dirname, "input-group.tsx"), "utf8");

describe("InputGroup", () => {
  it("says in its header why it is a client component", () => {
    expect(source).toMatch(/^"use client";$/m);
    expect(source.split('"use client"')[0]).toMatch(/client component because/);
  });

  it("is a group around a 44 px input, at least 44 px tall itself (D32)", () => {
    render(
      <InputGroup aria-label="Search">
        <InputGroupInput aria-label="Query" />
      </InputGroup>,
    );
    const group = screen.getByRole("group", { name: "Search" });
    expect(group.className).toContain("min-h-11");
    expect(group.className).not.toMatch(/(?:^|\s)h-9(?:\s|$)/);
    expect(screen.getByRole("textbox", { name: "Query" }).className).toContain("h-11");
  });

  it("draws the focus ring on the group at full strength, and no tinted ring when invalid (D35)", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Coupon" aria-invalid="true" />
      </InputGroup>,
    );
    const classes = screen.getByRole("group").className;
    expect(classes).toContain("has-[[data-slot=input-group-control]:focus-visible]:ring-ring");
    expect(classes).toContain("has-[[data-slot][aria-invalid=true]]:border-destructive");
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toContain("aria-invalid=true]]:ring-3");
    // The input inside draws no ring of its own: the group does.
    const input = screen.getByRole("textbox", { name: "Coupon" });
    expect(input.className).toContain("focus-visible:ring-0");
  });

  it("uses logical padding and margins on its addons and input", () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>€</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>EUR</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );
    const addons = [...document.querySelectorAll("[data-slot=input-group-addon]")];
    expect(addons[0]?.className).toContain("ps-2");
    expect(addons[0]?.className).toContain("has-[>button]:-ms-1");
    expect(addons[1]?.className).toContain("pe-2");
    expect(addons[1]?.className).toContain("has-[>button]:-me-1");
    const root = document.querySelector("[data-slot=input-group]");
    expect(root?.className).toContain("has-[>[data-align=inline-end]]:[&>input]:pe-1.5");
    expect(root?.className).toContain("has-[>[data-align=inline-start]]:[&>input]:ps-1.5");
  });

  it("takes the vertical padding off an addon that holds a button, so a 44 px button does not grow the group", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Coupon" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Apply</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const addon = document.querySelector("[data-slot=input-group-addon]");
    expect(addon?.className).toContain("has-[>button]:py-0");
    // The button may shrink, so a long label wraps rather than push the group wider.
    expect(screen.getByRole("button", { name: "Apply" }).className).toMatch(
      /(?:^|\s)shrink(?:\s|$)/,
    );
    expect(screen.getByRole("button", { name: "Apply" }).className).not.toMatch(
      /(?:^|\s)shrink-0(?:\s|$)/,
    );
  });

  it("focuses the input when the addon's padding is clicked, and leaves a button's click alone", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon">
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput aria-label="Query" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={onClick}>Go</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const input = screen.getByRole("textbox", { name: "Query" });
    await user.click(screen.getByTestId("addon"));
    expect(document.activeElement).toBe(input);
    (input as HTMLInputElement).blur();
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(input);
  });

  it("takes a textarea, which is taller than 44 px", () => {
    render(
      <InputGroup>
        <InputGroupTextarea aria-label="Note" />
      </InputGroup>,
    );
    expect(screen.getByRole("textbox", { name: "Note" }).className).toContain("min-h-16");
  });
});

describe("InputGroupButton", () => {
  it("is a 44 px button by default and 44 × 44 as an icon button (D32)", () => {
    render(
      <>
        <InputGroupButton>Apply</InputGroupButton>
        <InputGroupButton size="icon" aria-label="Search">
          <SearchIcon aria-hidden="true" />
        </InputGroupButton>
      </>,
    );
    const text = screen.getByRole("button", { name: "Apply" });
    expect(text.className).toContain("min-h-11");
    expect(text.getAttribute("data-size")).toBe("default");
    expect(text.getAttribute("type")).toBe("button");
    const icon = screen.getByRole("button", { name: "Search" });
    expect(icon.className).toContain("size-11");
    expect(icon.getAttribute("data-size")).toBe("icon");
  });

  it("has no size under 44 px: xs, sm, icon-xs and icon-sm are gone", () => {
    for (const size of ["xs", "sm", "icon-xs", "icon-sm"]) {
      // @ts-expect-error -- the sizes were removed on purpose (D32).
      render(<InputGroupButton size={size}>x</InputGroupButton>);
    }
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).not.toMatch(/(?:^|\s)(?:h-6|size-6|size-8|h-8)(?:\s|$)/);
    }
  });

  it("is a submit button when asked, and is reached with Tab", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <InputGroup>
          <InputGroupInput aria-label="Query" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Search</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Query" }));
    await user.tab();
    const button = screen.getByRole("button", { name: "Search" });
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.className).toContain("focus-visible:ring-ring");
  });

  it.each(longLabels)("wraps a long %s label instead of cutting it", (_locale, strings) => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>{strings.fieldLabel}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label={strings.fieldLabel} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>{strings.action}</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    expect(screen.getByRole("button", { name: strings.action }).className).not.toMatch(
      CLIPPING_CLASSES,
    );
    expect(screen.getByText(strings.fieldLabel, { selector: "span" }).className).not.toMatch(
      CLIPPING_CLASSES,
    );
    for (const element of document.querySelectorAll("[data-slot^=input-group]")) {
      expect(element.className).not.toMatch(CLIPPING_CLASSES);
    }
  });
});
