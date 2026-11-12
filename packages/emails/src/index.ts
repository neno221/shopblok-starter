// @shopblok/emails (M6 D121): the e-mails' HTML for both apps. The backend (CommonJS, Medusa's
// notifications) and the storefront (Payload's form and newsletter e-mails, and the DS's "E-mails"
// group, D130) read the same layouts, so one look and one escaping rule hold for every e-mail.
export { directionOf } from "./direction";
export { EmailDocument, EmailFrame } from "./frame";
export { labelsFor, type EmailLabels } from "./labels";
export {
  AdminInviteEmail,
  FormMessageEmail,
  LAYOUTS,
  NewsletterConfirmEmail,
  OrderCanceledEmail,
  OrderPlacedEmail,
  OrderShippedEmail,
  OrderTransferEmail,
  PasswordResetEmail,
  plainText,
  prepareEmail,
  RefundIssuedEmail,
  ReturnRequestedEmail,
  VerifyEmail,
  WelcomeEmail,
  type PreparedEmail,
  type PreparedLayoutProps,
} from "./layouts";
export { buttonLink, safeLink } from "./links";
export { render } from "./render";
export { fillRichText, lexicalToText, paragraphs, richTextHasText, RichText } from "./rich-text";
export { theme } from "./theme";
export {
  EMAIL_TOTAL_KINDS,
  EMAIL_TYPES,
  EMAIL_VARIABLES,
  isOrderEmail,
  ORDER_EMAIL_TYPES,
  type EmailCopy,
  type EmailForm,
  type EmailInput,
  type EmailOrder,
  type EmailOrderLine,
  type EmailShop,
  type EmailTotalKind,
  type EmailType,
  type LexicalNode,
  type OrderEmailType,
  type RenderedEmail,
  type RichTextDocument,
} from "./types";
export { fillVariables } from "./variables";
