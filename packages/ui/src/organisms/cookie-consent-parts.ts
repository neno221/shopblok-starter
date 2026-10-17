// Ours (T36, SETUP.md "Footers and site organisms (T36)"). What CookieConsent's banner and its dialog
// share, in one place so that they cannot drift apart. `ANSWER` is the look of the two one-click
// answers, "accept all" and "reject all": the same Button variant and size, spread into both
// buttons, so that refusing is exactly as prominent as agreeing (the plan's rule for T36, and what
// the EU's regulators ask of a consent banner). A test compares what the two buttons really draw,
// their class lists, so a button given another variant or size fails it. `acceptAll` and `rejectAll`
// make a new choice each time, so a caller that changes the one it receives changes nothing else.
// `LINK_SLOT` stands in for the policy link while the sentence is formatted (a private-use
// character no message contains, as NewsletterForm and PriceBlock do), and `capitalised` writes a
// link's text with a capital when it stands on its own after the shop's sentence instead of in the
// middle of the copy's.
import type { ConsentChoice } from "@shopblok/registry/contracts";

/** The look of "accept all" and "reject all", in the banner and in the dialog. */
export const ANSWER = { variant: "default", size: "default" } as const;

export const acceptAll = (): ConsentChoice => ({ analytics: true, marketing: true });
export const rejectAll = (): ConsentChoice => ({ analytics: false, marketing: false });

/** A character no message contains, standing in for the policy link while a sentence is formatted. */
export const LINK_SLOT = "";

/** The text with its first letter in capitals, by the rules of the locale ("cookie policy" to "Cookie policy"). */
export function capitalised(text: string, locale: string): string {
  const [first = ""] = text;
  return first.toLocaleUpperCase(locale) + text.slice(first.length);
}
