// @shopblok/emails (M6 D121): the e-mails' HTML for both apps. The backend (CommonJS, Medusa's
// notifications) and the storefront (the DS's "E-mails" group, D130) read the same layouts, so one
// look and one escaping rule hold for every e-mail.
export { directionOf } from "./direction";
export { EmailDocument, EmailFrame } from "./frame";
export {
  LAYOUTS,
  OrderTransferEmail,
  PasswordResetEmail,
  plainText,
  prepareEmail,
  VerifyEmail,
  type PreparedEmail,
  type PreparedLayoutProps,
} from "./layouts";
export { buttonLink, safeLink } from "./links";
export { render } from "./render";
export { fillRichText, lexicalToText, paragraphs, richTextHasText, RichText } from "./rich-text";
export { theme } from "./theme";
export {
  EMAIL_TYPES,
  EMAIL_VARIABLES,
  type EmailCopy,
  type EmailInput,
  type EmailShop,
  type EmailType,
  type LexicalNode,
  type RenderedEmail,
  type RichTextDocument,
} from "./types";
export { fillVariables } from "./variables";
