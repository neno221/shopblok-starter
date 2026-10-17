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

export type AccordionSection = z.infer<typeof AccordionSection>;
export type ToastMessage = z.infer<typeof ToastMessage>;
export type NewsletterSignup = z.infer<typeof NewsletterSignup>;
export type DiscountCode = z.infer<typeof DiscountCode>;
export type Countdown = z.infer<typeof Countdown>;
