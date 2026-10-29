import { Href } from "@shopblok/registry/contracts";
import type { Form } from "../../../payload-types";
import { formFields, newsletterField, type StoredFormField } from "../../forms/fields";
import type { Market, MarketMap } from "../../markets/types";
import { resolveLink, type InternalPaths, type LinkValue } from "../link";

// D81's forms as the blocks and the footer hand them to their islands: a form read at depth 1
// (populated in a page's block or the footer global) and a newsletter's privacy link, resolved for
// the market.

/** The form a relationship holds once populated, or `undefined` (an id alone, a deleted form). */
export const populatedForm = (value: unknown): Form | undefined =>
  value !== null && typeof value === "object" && "fields" in value ? (value as Form) : undefined;

/** A newsletter, ready to draw: the form to post to, its email field's name, the privacy page. */
export type NewsletterTarget = { formId: string; fieldName: string; privacyHref: string };

/**
 * A newsletter's form and privacy link, or `undefined` when it cannot be drawn: no form, a form
 * that is not one email field (the admin refuses it, but a form can change after it was picked), or
 * a privacy link that does not resolve to a page in the market or an https site.
 */
export function newsletterTarget(
  form: unknown,
  privacy: LinkValue | null | undefined,
  context: { market: Market; map: MarketMap; paths?: InternalPaths },
): NewsletterTarget | undefined {
  const doc = populatedForm(form);
  if (doc === undefined) return undefined;
  const fieldName = newsletterField(formFields(doc.fields as StoredFormField[]));
  const href = resolveLink(privacy, context)?.href;
  if (fieldName === undefined || href === undefined || !Href.safeParse(href).success)
    return undefined;
  return { formId: String(doc.id), fieldName, privacyHref: href };
}
