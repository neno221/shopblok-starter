import type { CSSProperties, ReactElement, ReactNode } from "react";
import { EmailFrame } from "./frame";
import { labelsFor, type EmailLabels } from "./labels";
import { buttonLink, safeLink } from "./links";
import { fillRichText, lexicalToText, richTextHasText, RichText } from "./rich-text";
import { theme } from "./theme";
import {
  EMAIL_VARIABLES,
  isOrderEmail,
  type EmailForm,
  type EmailInput,
  type EmailOrder,
  type EmailType,
  type RichTextDocument,
} from "./types";
import { fillVariables } from "./variables";

/** An e-mail's copy with its variables filled in, and its link checked. */
export type PreparedEmail = {
  subject: string;
  preheader: string;
  heading: string;
  body: RichTextDocument;
  cta: string;
  url: string;
  /** The order's summary, for the order e-mails. */
  order?: EmailOrder;
  /** The form's answers, for `form-message`. */
  answers?: EmailForm["answers"];
  /** The summary's and the answers' words, in the copy's language. */
  labels: EmailLabels;
};

/** What a layout draws: the prepared e-mail, and the input for its frame (shop, language). */
export type PreparedLayoutProps = { email: PreparedEmail; input: EmailInput };

/** `{{*}}` and `{{*:table}}`: form-builder's "every answer", which the layout draws as its list. */
const ALL_ANSWERS = /\{\{\s*\*(?::table)?\s*\}\}/g;

function stripAllAnswers(document: RichTextDocument): RichTextDocument {
  const strip = (node: RichTextDocument["root"]): RichTextDocument["root"] => ({
    ...node,
    ...(node.type === "text" && typeof node.text === "string"
      ? { text: node.text.replace(ALL_ANSWERS, "") }
      : {}),
    ...(Array.isArray(node.children)
      ? { children: (node.children as RichTextDocument["root"][]).map(strip) }
      : {}),
  });
  return { root: strip(document.root) };
}

/**
 * A form's e-mail as the form's own e-mail settings write it (D122): the form's subject and message
 * when it has them, else the copy's, with each `{{field}}` of the form (and the type's `{{form}}`)
 * filled in with the answer as text, in one pass, the same rule as a type's variables. So a value
 * with `<img onerror>` stays text.
 */
function prepareForm(input: EmailInput, allowed: readonly string[]) {
  const form = input.form;
  if (form === undefined) throw new Error("@shopblok/emails: form-message needs the form.");
  const names = [...allowed, ...form.answers.map((answer) => answer.name)];
  const values = {
    ...Object.fromEntries(form.answers.map((answer) => [answer.name, answer.value])),
    ...input.variables,
  };
  const subject = form.subject?.trim() ? fillVariables(form.subject, names, values) : undefined;
  const message =
    form.message !== undefined && richTextHasText(stripAllAnswers(form.message))
      ? fillRichText(stripAllAnswers(form.message), names, values)
      : undefined;
  return { subject, message, answers: form.answers };
}

/**
 * Fills the type's `{{variables}}` into each text of the copy (the subject, the preheader, the
 * heading, each text node of the body and the button's label) as text, and checks the link: it
 * throws unless the link is an absolute `http(s)` URL. An order e-mail without its order, or a
 * form's e-mail without its form, throws too.
 */
export function prepareEmail(type: EmailType, input: EmailInput): PreparedEmail {
  const allowed = EMAIL_VARIABLES[type];
  const fill = (text: string) => fillVariables(text, allowed, input.variables);
  const labels = labelsFor(input.language);
  const body = fillRichText(input.copy.body, allowed, input.variables);
  const base = {
    subject: fill(input.copy.subject),
    preheader: fill(input.copy.preheader),
    heading: fill(input.copy.heading),
    body,
    cta: fill(input.copy.cta),
    url: buttonLink(input.url),
    labels,
  };
  if (isOrderEmail(type)) {
    if (input.order === undefined)
      throw new Error(`@shopblok/emails: ${type} needs the order's summary.`);
    return { ...base, order: input.order };
  }
  if (type === "form-message") {
    const form = prepareForm(input, allowed);
    return {
      ...base,
      subject: form.subject ?? base.subject,
      body: form.message ?? body,
      answers: form.answers,
    };
  }
  return base;
}

// ---------------------------------------------------------------------------------------------
// Plain text

function orderText(order: EmailOrder, labels: EmailLabels): string {
  return [
    `${labels.order} ${order.number} · ${labels.placed}: ${order.date}`,
    order.lines
      .map(
        (line) =>
          `${line.quantity} × ${line.title}${line.detail ? ` (${line.detail})` : ""}: ${line.total}`,
      )
      .join("\n"),
    order.totals.map((row) => `${labels.totals[row.kind]}: ${row.amount}`).join("\n"),
    order.tracking?.length
      ? `${labels.tracking}:\n${order.tracking
          .map((parcel) => (parcel.url ? `${parcel.number} (${parcel.url})` : parcel.number))
          .join("\n")}`
      : "",
    order.shipTo?.length ? `${labels.shipTo}:\n${order.shipTo.join("\n")}` : "",
  ]
    .filter((part) => part !== "")
    .join("\n\n");
}

const answersText = (answers: EmailForm["answers"], labels: EmailLabels): string =>
  `${labels.answers}:\n${answers.map((answer) => `${answer.label}: ${answer.value}`).join("\n")}`;

/**
 * The plain-text part: the heading, the body, the order's summary or the form's answers, the
 * button's label with its link, and the shop.
 */
export function plainText(email: PreparedEmail, input: EmailInput): string {
  return [
    email.heading,
    lexicalToText(email.body),
    email.order ? orderText(email.order, email.labels) : "",
    email.answers?.length ? answersText(email.answers, email.labels) : "",
    `${email.cta}:\n${email.url}`,
    input.shop.name,
  ]
    .filter((part) => part.trim() !== "")
    .join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// HTML

const presentation = { role: "presentation", cellPadding: 0, cellSpacing: 0, border: 0 } as const;

const small: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: "20px",
  color: theme.mutedForeground,
};

/** The text a long value (a title, an address, a token) may break anywhere in, never widening the card. */
const breakable: CSSProperties = { overflowWrap: "anywhere", wordBreak: "break-word" };

function Heading({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        margin: "0 0 16px",
        fontSize: "24px",
        lineHeight: "32px",
        fontWeight: 700,
        color: theme.foreground,
      }}
    >
      {children}
    </h1>
  );
}

/**
 * The button and, under it, the same link written out for a client that draws no button. The link
 * written out is a block of its own, 44 px high (D32), and breaks anywhere, so a long token never
 * widens the card.
 */
function ButtonAndLink({ email }: { email: PreparedEmail }) {
  return (
    <>
      <table {...presentation} style={{ margin: "8px 0 0" }}>
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
    </>
  );
}

/** A row of label and value at the card's two edges (a sum, an answer). */
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const text: CSSProperties = {
    padding: "4px 0",
    fontSize: strong ? "16px" : "14px",
    lineHeight: strong ? "24px" : "20px",
    fontWeight: strong ? 700 : 400,
    color: theme.foreground,
    verticalAlign: "top",
  };
  return (
    <tr>
      <td style={{ ...text, ...breakable }}>{label}</td>
      <td style={{ ...text, textAlign: "end", whiteSpace: "nowrap", paddingInlineStart: "16px" }}>
        {value}
      </td>
    </tr>
  );
}

const rule: CSSProperties = { borderTop: `1px solid ${theme.border}` };

/**
 * An order's summary (D122): its number and date, each line with its quantity and total, the sums,
 * the tracking numbers (a carrier's link only when it is http(s)) and where it ships.
 */
function OrderSummary({ order, labels }: { order: EmailOrder; labels: EmailLabels }) {
  return (
    <table
      {...presentation}
      width="100%"
      data-slot="email-order"
      style={{ margin: "8px 0 16px", ...rule }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 0 8px" }}>
            <p style={{ ...small, ...breakable }}>
              {labels.order} {order.number} · {labels.placed}: {order.date}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <table {...presentation} width="100%">
              <tbody>
                {order.lines.map((line, index) => (
                  <tr key={index}>
                    <td style={{ padding: "8px 0", verticalAlign: "top", ...breakable }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          lineHeight: "24px",
                          color: theme.foreground,
                        }}
                      >
                        {line.title}
                      </p>
                      {line.detail ? <p style={{ ...small, ...breakable }}>{line.detail}</p> : null}
                      <p style={small}>
                        {labels.quantity}: {line.quantity}
                      </p>
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        paddingInlineStart: "16px",
                        verticalAlign: "top",
                        textAlign: "end",
                        whiteSpace: "nowrap",
                        fontSize: "16px",
                        lineHeight: "24px",
                        color: theme.foreground,
                      }}
                    >
                      {line.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
        {order.totals.length > 0 ? (
          <tr>
            <td style={{ padding: "8px 0 0", ...rule }}>
              <table {...presentation} width="100%">
                <tbody>
                  {order.totals.map((row, index) => (
                    <Row
                      key={index}
                      label={labels.totals[row.kind]}
                      value={row.amount}
                      strong={row.kind === "total" || row.kind === "refunded"}
                    />
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        ) : null}
        {order.tracking?.length ? (
          <tr>
            <td style={{ padding: "16px 0 0", ...rule }}>
              <p style={{ ...small, color: theme.foreground, fontWeight: 600 }}>
                {labels.tracking}
              </p>
              {order.tracking.map((parcel, index) => {
                const href = safeLink(parcel.url, ["http:", "https:"]);
                return (
                  <p key={index} style={{ margin: 0, fontSize: "14px", lineHeight: "20px" }}>
                    {href === undefined ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "12px 0",
                          color: theme.foreground,
                          ...breakable,
                        }}
                      >
                        {parcel.number}
                      </span>
                    ) : (
                      <a
                        href={href}
                        data-slot="email-tracking"
                        style={{
                          display: "inline-block",
                          padding: "12px 0",
                          color: theme.foreground,
                          textDecoration: "underline",
                          ...breakable,
                        }}
                      >
                        {parcel.number}
                      </a>
                    )}
                  </p>
                );
              })}
            </td>
          </tr>
        ) : null}
        {order.shipTo?.length ? (
          <tr>
            <td style={{ padding: "16px 0 0", ...rule }}>
              <p style={{ ...small, color: theme.foreground, fontWeight: 600 }}>{labels.shipTo}</p>
              {order.shipTo.map((line, index) => (
                <p key={index} style={{ ...small, ...breakable }}>
                  {line}
                </p>
              ))}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

/** A form's answers, a row each: the field's label, and the value as it was sent, as text. */
function Answers({ answers, labels }: { answers: EmailForm["answers"]; labels: EmailLabels }) {
  return (
    <table
      {...presentation}
      width="100%"
      data-slot="email-answers"
      style={{ margin: "8px 0 16px", ...rule }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 0 8px" }}>
            <p style={{ ...small, color: theme.foreground, fontWeight: 600 }}>{labels.answers}</p>
          </td>
        </tr>
        {answers.map((answer, index) => (
          <tr key={index}>
            <td style={{ padding: "4px 0", ...breakable }}>
              <p style={small}>{answer.label}</p>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  lineHeight: "24px",
                  color: theme.foreground,
                  whiteSpace: "pre-wrap",
                  ...breakable,
                }}
              >
                {answer.value}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Every layout: the heading, the body, what the type adds (an order's summary, a form's answers),
 * and the button with its link. M3's three and the account and newsletter e-mails add nothing.
 */
function EmailLayout({ email, input }: PreparedLayoutProps) {
  return (
    <EmailFrame shop={input.shop} language={input.language}>
      <Heading>{email.heading}</Heading>
      <RichText document={email.body} />
      {email.order ? <OrderSummary order={email.order} labels={email.labels} /> : null}
      {email.answers?.length ? <Answers answers={email.answers} labels={email.labels} /> : null}
      <ButtonAndLink email={email} />
    </EmailFrame>
  );
}

/**
 * Each type's layout, drawn from the copy `prepareEmail` filled in: `render()` prepares an e-mail
 * once, for its subject, its text part and this (PR 135 review, item 9). One layout draws them all:
 * what differs (the order, the answers) is in the prepared e-mail.
 */
export const LAYOUTS: Readonly<Record<EmailType, (props: PreparedLayoutProps) => ReactElement>> =
  Object.freeze({
    "verify-email": EmailLayout,
    "password-reset": EmailLayout,
    "order-transfer": EmailLayout,
    "order-placed": EmailLayout,
    "order-shipped": EmailLayout,
    "order-canceled": EmailLayout,
    "return-requested": EmailLayout,
    "refund-issued": EmailLayout,
    welcome: EmailLayout,
    "admin-invite": EmailLayout,
    "newsletter-confirm": EmailLayout,
    "form-message": EmailLayout,
  });

/** The type's layout from the copy as written: what the DS draws (D130). */
const layoutOf = (type: EmailType) =>
  function Email(input: EmailInput) {
    const Layout = LAYOUTS[type];
    return <Layout email={prepareEmail(type, input)} input={input} />;
  };

/** The e-mail a new customer's address is confirmed with (`auth.verification_requested`). */
export const VerifyEmail = layoutOf("verify-email");

/** The link that sets a new password (`auth.password_reset`: a customer's, or an admin user's). */
export const PasswordResetEmail = layoutOf("password-reset");

/** The request to move a guest's order to an account (`order.transfer_requested`). */
export const OrderTransferEmail = layoutOf("order-transfer");

/** The order's confirmation (`order.placed`): its lines and totals. */
export const OrderPlacedEmail = layoutOf("order-placed");

/** A shipment of the order (`shipment.created`): its lines and tracking links. */
export const OrderShippedEmail = layoutOf("order-shipped");

/** The order canceled (`order.canceled`). */
export const OrderCanceledEmail = layoutOf("order-canceled");

/** A return requested (`order.return_requested`): the lines going back. */
export const ReturnRequestedEmail = layoutOf("return-requested");

/** A refund (`payment.refunded`): the amount refunded. */
export const RefundIssuedEmail = layoutOf("refund-issued");

/** The welcome after the address is verified (`customer.created`, a customer with an account). */
export const WelcomeEmail = layoutOf("welcome");

/** An invite to Medusa Admin (`invite.created`, `invite.resent`). */
export const AdminInviteEmail = layoutOf("admin-invite");

/** The newsletter's double opt-in: the link to the page whose "Confirm" subscribes. */
export const NewsletterConfirmEmail = layoutOf("newsletter-confirm");

/** A Payload form's e-mail (form-builder's, rebuilt here): the answers as text. */
export const FormMessageEmail = layoutOf("form-message");
