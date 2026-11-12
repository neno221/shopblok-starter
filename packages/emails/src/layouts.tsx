import type { ReactElement } from "react";
import { EmailFrame } from "./frame";
import { buttonLink } from "./links";
import { fillRichText, lexicalToText, RichText } from "./rich-text";
import { theme } from "./theme";
import { EMAIL_VARIABLES, type EmailInput, type EmailType, type RichTextDocument } from "./types";
import { fillVariables } from "./variables";

/** An e-mail's copy with its variables filled in, and its link checked. */
export type PreparedEmail = {
  subject: string;
  preheader: string;
  heading: string;
  body: RichTextDocument;
  cta: string;
  url: string;
};

/** What a layout draws: the prepared e-mail, and the input for its frame (shop, language). */
export type PreparedLayoutProps = { email: PreparedEmail; input: EmailInput };

/**
 * Fills the type's `{{variables}}` into each text of the copy (the subject, the preheader, the
 * heading, each text node of the body and the button's label) as text, and checks the link: it
 * throws unless the link is an absolute `http(s)` URL.
 */
export function prepareEmail(type: EmailType, input: EmailInput): PreparedEmail {
  const allowed = EMAIL_VARIABLES[type];
  const fill = (text: string) => fillVariables(text, allowed, input.variables);
  return {
    subject: fill(input.copy.subject),
    preheader: fill(input.copy.preheader),
    heading: fill(input.copy.heading),
    body: fillRichText(input.copy.body, allowed, input.variables),
    cta: fill(input.copy.cta),
    url: buttonLink(input.url),
  };
}

/** The plain-text part: the heading, the body, the button's label with its link, and the shop. */
export function plainText(email: PreparedEmail, input: EmailInput): string {
  return [email.heading, lexicalToText(email.body), `${email.cta}:\n${email.url}`, input.shop.name]
    .filter((part) => part.trim() !== "")
    .join("\n\n");
}

/**
 * The layout of an e-mail whose point is one link (M3's three): the heading, the body, the button,
 * and the link written out under it for a client that draws no button. The link written out is a
 * block of its own, 44 px high (D32), and breaks anywhere, so a long token never widens the card.
 */
function LinkLayout({ email, input }: PreparedLayoutProps) {
  return (
    <EmailFrame shop={input.shop} language={input.language}>
      <h1
        style={{
          margin: "0 0 16px",
          fontSize: "24px",
          lineHeight: "32px",
          fontWeight: 700,
          color: theme.foreground,
        }}
      >
        {email.heading}
      </h1>
      <RichText document={email.body} />
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ margin: "8px 0 0" }}
      >
        <tbody>
          <tr>
            <td style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>
              <a
                href={email.url}
                data-slot="email-button"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  fontSize: "16px",
                  lineHeight: "20px",
                  fontWeight: 600,
                  color: theme.primaryForeground,
                  textDecoration: "none",
                  borderRadius: theme.radius,
                }}
              >
                {email.cta}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ margin: "16px 0 0", fontSize: "14px", lineHeight: "20px" }}>
        <a
          href={email.url}
          data-slot="email-link"
          style={{
            display: "inline-block",
            padding: "12px 0",
            color: theme.mutedForeground,
            wordBreak: "break-all",
          }}
        >
          {email.url}
        </a>
      </p>
    </EmailFrame>
  );
}

/**
 * Each type's layout, drawn from the copy `prepareEmail` filled in: `render()` prepares an e-mail
 * once, for its subject, its text part and this (PR 135 review, item 9).
 */
export const LAYOUTS: Readonly<Record<EmailType, (props: PreparedLayoutProps) => ReactElement>> = {
  "verify-email": LinkLayout,
  "password-reset": LinkLayout,
  "order-transfer": LinkLayout,
};

/** The type's layout from the copy as written: what the DS draws (D130). */
const layoutOf = (type: EmailType) =>
  function Email(input: EmailInput) {
    const Layout = LAYOUTS[type];
    return <Layout email={prepareEmail(type, input)} input={input} />;
  };

/** The e-mail a new customer's address is confirmed with (`auth.verification_requested`). */
export const VerifyEmail = layoutOf("verify-email");

/** The link that sets a new password (`auth.password_reset`). */
export const PasswordResetEmail = layoutOf("password-reset");

/** The request to move a guest's order to an account (`order.transfer_requested`). */
export const OrderTransferEmail = layoutOf("order-transfer");
