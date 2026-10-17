// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"; D50). The time left to an offer, in
// days, hours, minutes and seconds. This is the server half: it writes the two sentences (what the
// timer counts down to, with the end time as text from `formatDate`, and what is said when it is
// over) and hands them, with the contract's `endsAt` and `now`, to CountdownClock, the small client
// part that draws the digits and ticks. The render counts from the contract's `now` and never reads
// the clock (D50), so a prerendered page and the browser's first render agree and the page stays
// static; the browser ticks on from there after hydration. The end time is written in `timeZone`
// (UTC unless the caller gives its market's), not in the reader's: the server and the browser then
// format the same text, so hydration finds no difference, and an offer ends at the same moment for
// everyone. The zone's abbreviation is in the text ("1:30 PM UTC"). WCAG 2.2.2 asks for a way to
// pause, stop or hide content that updates by itself unless the updating is essential: here the
// numbers are the time left to a real deadline (that is the information, and a paused one would be
// wrong), and the end time stands above them as static text, so nothing depends on watching them.
// The timer is not announced every second (`aria-live="off"`), and its end is, once (WCAG 4.1.3).
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type { Countdown } from "@shopblok/registry/contracts";
import { CountdownClock } from "@shopblok/ui/molecules/countdown-clock";
import type * as React from "react";

type CountdownTimerProps = Omit<React.ComponentProps<"div">, "children"> & {
  countdown: Countdown;
  /** The wording, from the catalog's `molecules.countdownTimer`. */
  copy: Messages["molecules"]["countdownTimer"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * The IANA time zone the end time is written in (`Europe/Athens`). Not the reader's, so the
   * server and the browser write the same text; the market's, or UTC.
   */
  timeZone?: string;
};

function CountdownTimer({
  countdown,
  copy,
  locale,
  timeZone = "UTC",
  ...props
}: CountdownTimerProps) {
  const { endsAt, now } = countdown;
  const date = formatDate(endsAt, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  });
  return (
    <CountdownClock
      endsAt={endsAt}
      now={now}
      locale={locale}
      label={formatMessage(copy.label, { date }, locale)}
      endedText={copy.ended}
      {...props}
    />
  );
}

export { CountdownTimer };
export type { CountdownTimerProps };
