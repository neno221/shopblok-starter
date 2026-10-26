// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, SBP
// order-confirmation.md), on ReUI's timeline primitive (`primitives/timeline.tsx`). An order's history
// as an ordered list named "Order history", oldest first, one item per event: its words by kind
// ("Order placed", "Shipped", "Delivered"), the date and time as a `<time>` with its ISO value
// (`formatDate` in the market's locale and time zone, D65, UTC unless given, so the server and
// every reader agree), and for a shipment the carrier, the tracking number and "Track parcel", a
// 44 px link to the carrier's page that opens in a new tab and says so, with the number after its
// words for a screen reader. The latest
// event is the order's state: it is marked `aria-current="step"` and with a "Latest" badge, and its
// dot is filled; the others are done (the primitive draws their line and dot in the primary colour),
// so a reader hears where the order is, and the eye sees it by fill and words, not colour alone. A
// canceled order's last event says so in the destructive colour, with the same words. A server
// component: the primitive's parts are client components that share the active step, which this
// renders; it holds no state.
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type {
  OrderEvent,
  OrderTimeline as OrderTimelineContent,
} from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Link } from "@shopblok/ui/atoms/link";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@shopblok/ui/primitives/timeline";
import type * as React from "react";

type OrderTimelineProps = Omit<React.ComponentProps<"div">, "children" | "defaultValue"> &
  OrderTimelineContent & {
    /** The wording, from the catalog's `organisms.orderTimeline`. */
    copy: Messages["organisms"]["orderTimeline"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The list's name when a page has two (the design system's states); `copy.label` otherwise. */
    label?: string;
    /** The market's IANA time zone (D65) the dates are in; UTC unless given. */
    timeZone?: string;
  };

/** The copy's key of each kind of event. */
const eventKeys = {
  placed: "placed",
  paid: "paid",
  fulfilled: "fulfilled",
  shipped: "shipped",
  delivered: "delivered",
  canceled: "canceled",
  "return-requested": "returnRequested",
  returned: "returned",
} as const satisfies Record<
  OrderEvent["kind"],
  keyof Messages["organisms"]["orderTimeline"]["events"]
>;

// `Link` takes whatever `next/link` takes; a carrier's page is an absolute URL the order holds.
type LinkHref = React.ComponentProps<typeof Link>["href"];

function OrderTimeline({
  events,
  copy,
  locale,
  label,
  timeZone = "UTC",
  className,
  ...props
}: OrderTimelineProps) {
  const last = events.length - 1;
  return (
    <Timeline
      value={events.length}
      data-slot="order-timeline"
      render={<ol aria-label={label ?? copy.label} />}
      className={cn("min-w-0 ps-6", className)}
      {...props}
    >
      {events.map((event, index) => {
        const latest = index === last;
        const canceled = event.kind === "canceled";
        return (
          <TimelineItem
            // Two events of one kind at one time (a split shipment) are allowed; the list never reorders.
            key={index}
            step={index + 1}
            render={<li aria-current={latest ? "step" : undefined} />}
            data-kind={event.kind}
            className="min-w-0"
          >
            <TimelineHeader className="flex min-w-0 flex-col">
              <TimelineSeparator />
              {/* In the market's time zone (D65), UTC unless given: the same on every server. */}
              <TimelineDate dateTime={event.at} className="order-2 mt-0.5 mb-0">
                {formatDate(event.at, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone,
                })}
              </TimelineDate>
              <TimelineTitle
                render={<p />}
                className={cn(
                  "order-1 flex min-w-0 flex-wrap items-center gap-2 leading-snug wrap-anywhere",
                  latest && "font-semibold",
                  canceled && "text-destructive",
                )}
              >
                <span>{copy.events[eventKeys[event.kind]]}</span>
                {latest ? <Badge variant="secondary">{copy.latest}</Badge> : null}
              </TimelineTitle>
              <TimelineIndicator className={cn(latest && "bg-primary")} />
            </TimelineHeader>
            {event.carrier === undefined &&
            event.trackingNumber === undefined &&
            event.trackingUrl === undefined ? null : (
              <TimelineContent className="mt-1 flex min-w-0 flex-col gap-0.5 wrap-anywhere">
                {event.carrier === undefined ? null : (
                  <span>{formatMessage(copy.carrier, { carrier: event.carrier }, locale)}</span>
                )}
                {event.trackingNumber === undefined ? null : (
                  <span>
                    {formatMessage(copy.tracking, { number: event.trackingNumber }, locale)}
                  </span>
                )}
                {event.trackingUrl === undefined ? null : (
                  <Link
                    href={event.trackingUrl as LinkHref}
                    variant="standalone"
                    target="_blank"
                    newTabLabel={copy.newTab}
                    data-slot="order-timeline-track"
                    className="w-fit"
                  >
                    {copy.track}
                    {event.trackingNumber === undefined ? null : (
                      <VisuallyHidden> {event.trackingNumber}</VisuallyHidden>
                    )}
                  </Link>
                )}
              </TimelineContent>
            )}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}

export { OrderTimeline };
export type { OrderTimelineProps };
