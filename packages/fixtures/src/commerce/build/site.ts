import type { Context } from "../context";
import type { CommerceFixture } from "../types";

// The sample data of AccordionItem and Toast (T33): a FAQ's questions and answers, and one toast of
// each kind; and CookieConsent's (T36): the cookie policy, the shop's own sentence, and choices.
// The words are in `copy/` (`site`); the sections' ids are shared by the four locales, so a story
// addresses "the returns question" the same way everywhere.

/** The ids of the five questions (an accordion's `value`), in the order they are asked. */
const faqValues = ["shipping", "returns", "sizing", "payment", "care"] as const;

export function buildSite(ctx: Context): CommerceFixture["site"] {
  const { faq, toasts, cookieMessage } = ctx.copy.site;
  const policyHref = ctx.href("/pages/cookies");
  return {
    faq: {
      items: faqValues.map((value, index) => {
        const item = faq.items[index];
        if (item === undefined) throw new Error(`The copy has no question ${index} (${value})`);
        return { value, title: item.title, answer: [...item.answer] };
      }),
      long: { value: "long", title: faq.long.title, answer: [...faq.long.answer] },
    },
    toasts: {
      success: sample("success", toasts.success),
      error: sample("error", toasts.error),
      info: sample("info", toasts.info),
      long: sample("success", toasts.long),
    },
    cookieConsent: {
      copy: { policyHref },
      message: { policyHref, message: cookieMessage },
      choices: {
        rejected: { analytics: false, marketing: false },
        analytics: { analytics: true, marketing: false },
        accepted: { analytics: true, marketing: true },
      },
    },
  };
}

/** A toast's copy as the sample the story shows: the button's words and the message. */
function sample(
  kind: CommerceFixture["site"]["toasts"]["success"]["message"]["kind"],
  copy: Context["copy"]["site"]["toasts"]["success"],
): CommerceFixture["site"]["toasts"]["success"] {
  return {
    trigger: copy.trigger,
    message: {
      kind,
      title: copy.title,
      ...(copy.description === undefined ? {} : { description: copy.description }),
      ...(copy.actionLabel === undefined ? {} : { actionLabel: copy.actionLabel }),
    },
  };
}
