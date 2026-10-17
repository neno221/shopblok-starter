import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "./timeline";

const source = readFileSync(path.join(import.meta.dirname, "timeline.tsx"), "utf8");

function Events(
  props: Partial<React.ComponentProps<typeof Timeline>> & { title?: string; content?: string },
) {
  const { title = "Order placed", content = "We have your order.", ...rest } = props;
  return (
    <Timeline defaultValue={2} {...rest}>
      <TimelineItem step={1}>
        <TimelineHeader>
          <TimelineSeparator />
          <TimelineDate dateTime="2026-10-12">12 Oct 2026</TimelineDate>
          <TimelineTitle>{title}</TimelineTitle>
          <TimelineIndicator />
        </TimelineHeader>
        <TimelineContent>{content}</TimelineContent>
      </TimelineItem>
      <TimelineItem step={2}>
        <TimelineHeader>
          <TimelineSeparator />
          <TimelineDate dateTime="2026-10-13">13 Oct 2026</TimelineDate>
          <TimelineTitle>Shipped</TimelineTitle>
          <TimelineIndicator />
        </TimelineHeader>
        <TimelineContent>On its way.</TimelineContent>
      </TimelineItem>
      <TimelineItem step={3}>
        <TimelineHeader>
          <TimelineSeparator />
          <TimelineDate dateTime="2026-10-15">15 Oct 2026</TimelineDate>
          <TimelineTitle>Delivered</TimelineTitle>
          <TimelineIndicator />
        </TimelineHeader>
        <TimelineContent>At your door.</TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}

describe("Timeline", () => {
  it("says in its header why it is a client component", () => {
    expect(source).toMatch(/^"use client";$/m);
    expect(source.split('"use client"')[0]).toMatch(/client component because/);
  });

  it("is a list of events with a title, a time element and content each", () => {
    render(<Events />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Order placed",
      "Shipped",
      "Delivered",
    ]);
    const first = screen.getByText("12 Oct 2026");
    expect(first.tagName).toBe("TIME");
    expect(first.getAttribute("datetime")).toBe("2026-10-12");
    expect(screen.getByText("We have your order.")).toBeTruthy();
  });

  it("marks the events up to the active step completed", () => {
    render(<Events />);
    const items = [...document.querySelectorAll("[data-slot=timeline-item]")];
    expect(items.map((item) => item.hasAttribute("data-completed"))).toEqual([true, true, false]);
  });

  it("hides its indicators and separators from assistive technology", () => {
    render(<Events />);
    for (const part of document.querySelectorAll(
      "[data-slot=timeline-indicator], [data-slot=timeline-separator]",
    )) {
      expect(part.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("puts the vertical indicator and separator at the logical start, and flips their offset in right-to-left", () => {
    render(<Events />);
    const indicator = document.querySelector("[data-slot=timeline-indicator]");
    const separator = document.querySelector("[data-slot=timeline-separator]");
    for (const part of [indicator, separator]) {
      expect(part?.className).toContain("group-data-[orientation=vertical]/timeline:-start-6");
      expect(part?.className).toContain(
        "rtl:group-data-[orientation=vertical]/timeline:translate-x-1/2",
      );
    }
    expect(indicator?.className).toContain("group-data-[orientation=horizontal]/timeline:start-0");
    expect(separator?.className).toContain(
      "rtl:group-data-[orientation=horizontal]/timeline:-translate-x-4.5",
    );
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])-?(?:left|right)-/);
    expect(classes).not.toMatch(/(?:^|[\s:])(?:[ml][lr])-\d/);
  });

  it("keeps its orientation on data-orientation, which its group variants read", () => {
    const { unmount } = render(<Events />);
    expect(document.querySelector("[data-slot=timeline]")?.getAttribute("data-orientation")).toBe(
      "vertical",
    );
    unmount();
    render(<Events orientation="horizontal" />);
    const timeline = document.querySelector("[data-slot=timeline]");
    expect(timeline?.getAttribute("data-orientation")).toBe("horizontal");
    expect(timeline?.className).toContain("data-[orientation=horizontal]:flex-row");
    expect(document.body.innerHTML).not.toMatch(/data-(?:horizontal|vertical):/);
  });

  it("draws no dark variant, no palette colour and no tinted focus ring", () => {
    render(<Events />);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).toContain("border-primary");
  });

  it("can render an element of the caller's choice through `render`", () => {
    render(
      <Timeline defaultValue={1} render={<ol data-testid="timeline" />}>
        <TimelineItem step={1} render={<li data-testid="item" />}>
          <TimelineTitle render={<h2 />}>One</TimelineTitle>
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByTestId("timeline").tagName).toBe("OL");
    expect(screen.getByTestId("item").tagName).toBe("LI");
    expect(screen.getByRole("heading", { level: 2, name: "One" })).toBeTruthy();
  });

  it.each(longLabels)(
    "lets a long %s title and content wrap: no clipping class",
    (_locale, strings) => {
      render(<Events title={strings.productName} content={strings.productDescription} />);
      expect(screen.getByText(strings.productName).className).not.toMatch(CLIPPING_CLASSES);
      expect(screen.getByText(strings.productDescription).className).not.toMatch(CLIPPING_CLASSES);
      for (const element of document.querySelectorAll("[data-slot^=timeline]")) {
        expect(element.className).not.toMatch(CLIPPING_CLASSES);
      }
    },
  );
});
