import { render as renderReactEmail } from "@react-email/render";
import { EmailDocument } from "./frame";
import { LAYOUTS, plainText, prepareEmail } from "./layouts";
import type { EmailInput, EmailType, RenderedEmail } from "./types";

/**
 * An e-mail of `type` as it is sent (D121): the subject, the HTML (React Email's renderer, with its
 * XHTML doctype) and the plain-text part. Every `{{variable}}` is a text node, so React escapes it
 * once in the HTML, and the subject and the text part have it as written. Throws when the link is
 * not an absolute `http(s)` URL.
 */
export async function render(type: EmailType, input: EmailInput): Promise<RenderedEmail> {
  const email = prepareEmail(type, input);
  const Layout = LAYOUTS[type];
  const html = await renderReactEmail(
    <EmailDocument language={input.language} subject={email.subject} preheader={email.preheader}>
      <Layout {...input} />
    </EmailDocument>,
  );
  return { subject: email.subject, html, text: plainText(email, input) };
}
