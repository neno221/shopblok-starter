import { z } from "zod";
import { Href, Id, IsoDateTime } from "./content";

// What the site-wide molecules show (T33): a section of an accordion, a toast, the newsletter's
// form, a code to copy, a countdown. Their words are content a shop or a caller writes (a FAQ's
// question, a toast's message); the components' own labels are copy (D43).

/** One section of an accordion (AccordionItem): its heading; its body is the component's children. */
export const AccordionSection = z.object({
  value: Id.describe("Unique in its accordion"),
  title: z.string().min(1),
});

/** A toast's message (SPEC §13: announced politely); its action's handler is a prop. */
export const ToastMessage = z.object({
  kind: z.enum(["success", "error", "info"]),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  actionLabel: z.string().min(1).optional(),
});

/** The newsletter form's state (NewsletterForm): the address so far and the privacy page. */
export const NewsletterSignup = z.object({
  email: z.string().describe("Kept after an error, empty at first"),
  privacyHref: Href.describe("The privacy policy the consent text links to"),
});

/** A discount code to copy (CopyCodeChip). */
export const DiscountCode = z.object({
  code: z.string().min(1).max(40),
});

/** A countdown to a time (CountdownTimer, D50): the server renders `now`, the browser ticks on. */
export const Countdown = z
  .object({
    endsAt: IsoDateTime,
    now: IsoDateTime.describe(
      "The time of the server's render: the fixtures' `now` on the DS page",
    ),
  })
  .refine((countdown) => Date.parse(countdown.now) <= Date.parse(countdown.endsAt), {
    message: "the countdown has already ended",
    path: ["endsAt"],
  });

// T36: the site's organisms. Cookie consent's three categories are SPEC §8.4's (necessary, analytics,
// marketing); the visitor's choice is per visitor, so it is a prop of its own (D44), not part of
// what the shop writes.

/**
 * What a visitor chose (CookieConsent): necessary cookies are always on, so they are not a choice.
 * Strict, so a category the store does not know fails the parse instead of being taken as consent.
 */
export const ConsentChoice = z.strictObject({ analytics: z.boolean(), marketing: z.boolean() });

/** What the shop says in the cookie banner (`site-settings`' cookie-consent copy, SPEC §7.3). */
export const CookieConsent = z.object({
  policyHref: Href.describe("The cookie policy the banner and the dialog link to"),
  message: z.string().min(1).optional().describe("The shop's own sentence, in place of the copy's"),
});

/** What a loading skeleton stands in for (SPEC §9.3's loading skeletons): a layout of the store's. */
export const LoadingSkeleton = z.object({
  layout: z.enum(["product-grid", "product-page", "cart", "account-list"]),
  items: z
    .int()
    .min(1)
    .max(24)
    .optional()
    .describe("The cards, lines or rows it draws; each layout has its own number unless given"),
});

export type AccordionSection = z.infer<typeof AccordionSection>;
export type ToastMessage = z.infer<typeof ToastMessage>;
export type NewsletterSignup = z.infer<typeof NewsletterSignup>;
export type DiscountCode = z.infer<typeof DiscountCode>;
export type Countdown = z.infer<typeof Countdown>;
export type ConsentChoice = z.infer<typeof ConsentChoice>;
export type CookieConsent = z.infer<typeof CookieConsent>;
export type LoadingSkeleton = z.infer<typeof LoadingSkeleton>;
