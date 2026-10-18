import type { Context } from "../context";
import { cartSpec } from "../data/checkout";
import { fixtureNow } from "../now";
import type { CommerceFixture } from "../types";

// The sample data of NewsletterForm, CopyCodeChip and CountdownTimer (T33). None of it is words of
// a locale (an address, a code and a time are the same in all four), so it needs no copy; only the
// privacy page's link follows the market's prefix.

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** An ISO time `ms` after the fixtures' fixed now (D50). */
const after = (ms: number) => new Date(Date.parse(fixtureNow) + ms).toISOString();

/** A countdown that the server renders at `fixtureNow` and that ends `ms` later. */
const endsIn = (ms: number) => ({ endsAt: after(ms), now: fixtureNow });

export function buildMarketing(ctx: Context): CommerceFixture["marketing"] {
  const privacyHref = ctx.href("/privacy");
  return {
    newsletter: {
      empty: { email: "", privacyHref },
      typed: { email: "alex.morgan@example.com", privacyHref },
      // An address no input is wide enough for: over 90 characters, the way a company's can be.
      long: {
        email:
          "alexandra.montgomery-featherstonehaugh.newsletter-signups@subdomain.example-company-name.co.uk",
        privacyHref,
      },
    },
    // The cart's own code, so the chip and the cart's discount line show the same one.
    discountCode: { code: cartSpec.promo.code },
    // The contract's longest (40 characters), with no hyphen or space a browser could break at.
    longDiscountCode: { code: "AUTUMNEDITFRIENDSFAMILYVIPCODE2026FINAL0" },
    countdown: {
      // 3 days 4 hours 30 minutes 45 seconds.
      days: endsIn(3 * DAY + 4 * HOUR + 30 * MINUTE + 45 * SECOND),
      // 5 hours 12 minutes 8 seconds.
      hours: endsIn(5 * HOUR + 12 * MINUTE + 8 * SECOND),
      // The last 45 seconds.
      seconds: endsIn(45 * SECOND),
      // Three digits of days: 128 days 7 hours 5 minutes 9 seconds.
      long: endsIn(128 * DAY + 7 * HOUR + 5 * MINUTE + 9 * SECOND),
      // Over, as soon as the server renders it: the contract allows `now` to be `endsAt`.
      ended: endsIn(0),
    },
  };
}
