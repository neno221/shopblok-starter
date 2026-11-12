import "server-only";
import { renderEmail } from "../../payload/send-email";
import { ActionError, action, FieldsError, toFieldErrors } from "../actions/action";
import { filled, FormPost, reachableForm } from "../actions/form-handlers";
import { getPayloadClient } from "../cms/payload";
import { answersSchema, HONEYPOT_FIELD, newsletterField } from "../forms/fields";
import { buildPublicUrl } from "../markets/url";
import type { Market, MarketMap } from "../markets/types";
import { siteOrigin } from "../site-origin";
import { signToken, tokenKey } from "./token";

// The newsletter's sign-up (D122, T99), the `newsletter` block's and the footer's action: the
// checks of every form's post (the spam trap, the market, a form a visitor can reach, its fields),
// then no submission yet but an e-mail to the address with a link to confirm it (double opt-in).
// The answer is the same for any address, one already subscribed included, so the form tells no
// one who is on the list; the link and its page say the rest (`confirm.ts`).

/** Whether the confirmation e-mail went: a bot that filled the spam trap gets none, and is not told. */
export type SubscribeAnswer = { sent: boolean };

/** The confirmation page's address for `token`, absolute, in the market the address signed up in. */
export function confirmUrl(market: Market, map: MarketMap, token: string): string {
  const path = buildPublicUrl(
    market,
    `/newsletter/confirm?token=${encodeURIComponent(token)}`,
    map,
  );
  return new URL(path, siteOrigin()).href;
}

export const subscribeAction = action(FormPost, async ({ market, form, answers }) => {
  if (filled(answers[HONEYPOT_FIELD])) return { sent: false } satisfies SubscribeAnswer;
  const reachable = await reachableForm(market, form);
  if (reachable === null)
    throw new ActionError("not-found", `newsletter: no form ${form} in "${market}"`);
  const field = newsletterField(reachable.form.fields);
  if (field === undefined)
    throw new ActionError("not-found", `newsletter: form ${form} is not a newsletter's form`);
  const parsed = answersSchema(reachable.form.fields).safeParse(answers);
  if (!parsed.success) throw new FieldsError(toFieldErrors(parsed.error.issues));
  const email = String(parsed.data[field]).trim();
  const language = reachable.market.language;
  try {
    const { token } = signToken(
      { email, form: reachable.form.id, market: reachable.market.key, language },
      tokenKey(),
    );
    const payload = await getPayloadClient();
    const rendered = await renderEmail(payload, {
      type: "newsletter-confirm",
      language,
      variables: { email },
      url: confirmUrl(reachable.market, reachable.map, token),
    });
    await payload.sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    // The message only: an adapter's error can carry the address.
    console.error(
      `newsletter: the confirmation e-mail could not be sent (${error instanceof Error ? error.name : "error"})`,
    );
    throw new ActionError("unavailable", "newsletter: the confirmation e-mail could not be sent");
  }
  return { sent: true } satisfies SubscribeAnswer;
});
