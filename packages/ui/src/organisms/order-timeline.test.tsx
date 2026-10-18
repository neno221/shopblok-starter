// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). OrderTimeline's tests, in
// Testing Library and happy-dom: an ordered list named "Order history", oldest first, each event in
// words with its date as a `<time>` in UTC, the latest marked `aria-current="step"` and "Latest" in
// words, the shipment's carrier, number and a 44 px "Track parcel" link that opens a new tab and says
// so, a canceled order, a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatDate, LOCALES, type Locale } from "@shopblok/i18n";
import type { OrderTimeline as OrderTimelineContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { OrderTimeline, type OrderTimelineProps } from "./order-timeline";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.orderTimeline;
const timelineOf = (
  locale: Locale,
  which: "delivered" | "placed" = "delivered",
): OrderTimelineContent => commerceFixtures[locale].account.timeline[which];

function element(
  locale: Locale = "en",
  which: "delivered" | "placed" = "delivered",
  props: Partial<OrderTimelineProps> = {},
) {
  return (
    <OrderTimeline
      {...timelineOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("OrderTimeline", () => {
  it.each(LOCALES)("is an ordered list named 'Order history', oldest first, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const list = screen.getByRole("list", { name: copy.label });
    expect(list.tagName.toLowerCase()).toBe("ol");
    const items = within(list).getAllByRole("listitem");
    const events = timelineOf(locale).events;
    expect(items).toHaveLength(events.length);
    expect(items.map((item) => item.getAttribute("data-kind"))).toEqual(
      events.map((event) => event.kind),
    );
    expect(items[0]?.textContent).toContain(copy.events.placed);
    expect(items.at(-1)?.textContent).toContain(copy.events.delivered);
  });

  it.each(LOCALES)("dates each event as a <time> in UTC, in %s", (locale) => {
    render(element(locale));
    const times = [...document.querySelectorAll("time")];
    const events = timelineOf(locale).events;
    expect(times.map((time) => time.getAttribute("datetime"))).toEqual(events.map((e) => e.at));
    expect(plain(times[0]?.textContent ?? "")).toBe(
      plain(
        formatDate(events[0]?.at ?? "", htmlLang[locale], {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }),
      ),
    );
  });

  it.each(["delivered", "placed"] as const)(
    "marks the latest event of the %s order, and only it, as the order's state",
    (which) => {
      render(element("en", which));
      const marked = document.querySelectorAll('[aria-current="step"]');
      expect(marked).toHaveLength(1);
      expect(marked[0]?.tagName.toLowerCase()).toBe("li");
      expect(marked[0]?.getAttribute("data-kind")).toBe(
        timelineOf("en", which).events.at(-1)?.kind,
      );
      expect(marked[0]?.textContent).toContain("Latest");
      expect(screen.getAllByText("Latest")).toHaveLength(1);
    },
  );

  it.each(LOCALES)("says who carries the parcel, its number and links to it, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const shipped = timelineOf(locale).events.find((event) => event.kind === "shipped");
    const item = document.querySelector('[data-kind="shipped"]') as HTMLElement;
    expect(item.textContent).toContain(shipped?.carrier);
    expect(item.textContent).toContain(shipped?.trackingNumber);
    const link = slot("order-timeline-track", item) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(shipped?.trackingUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
    // Its name starts with its words, then the number, then that it opens a new tab.
    expect(link.textContent?.startsWith(copy.track)).toBe(true);
    expect(link.textContent).toContain(shipped?.trackingNumber);
    expect(link.textContent).toContain(copy.newTab);
    expect(link.className).toContain("min-h-11");
  });

  it("draws no link for an event with no tracking page", () => {
    render(element("en", "placed"));
    expect(slot("order-timeline-track")).toBeNull();
  });

  it("says a canceled order in the destructive colour, and in words", () => {
    const events = [
      ...timelineOf("en", "placed").events,
      { kind: "canceled" as const, at: "2026-09-30T08:00:00.000Z" },
    ];
    render(element("en", "placed", { events }));
    const title = screen.getByText("Canceled").parentElement as HTMLElement;
    expect(title.className).toContain("text-destructive");
    expect(document.querySelector('[aria-current="step"]')?.getAttribute("data-kind")).toBe(
      "canceled",
    );
  });

  it("takes another name when a page has two", () => {
    render(element("en", "delivered", { label: "History of order #1042" }));
    expect(screen.getByRole("list", { name: "History of order #1042" })).toBeTruthy();
  });

  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    render(
      element(locale, "delivered", {
        events: timelineOf(locale).events.map((event) =>
          event.kind === "shipped" ? { ...event, carrier: long.storeName } : event,
        ),
        copy: {
          ...copyOf(locale),
          track: long.linkLabel,
          events: { ...copyOf(locale).events, delivered: long.badge },
        },
      }),
    );
    const root = slot("order-timeline") as HTMLElement;
    expect(classesIn(root).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByText(long.badge).parentElement?.className).toContain("wrap-anywhere");
    expect(slot("order-timeline-track")?.closest('[class*="wrap-anywhere"]')).not.toBeNull();
  });
});
