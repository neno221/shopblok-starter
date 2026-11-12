import { EmailView } from "../contracts";
import type { EntryInput } from "../types";

// D130: the "E-mails" group, one entry per e-mail type of `@shopblok/emails` (M6 D121, D122), each
// its layout drawn with the seed's copy. T98 adds M3's three; T99 the order, account, newsletter and
// form e-mails. No family: an e-mail is not picked in Payload, so it has no thumbnail.

const email = <const Slug extends string>(slug: Slug, label: string, name: string) =>
  ({
    id: `emails/${slug}`,
    group: "emails",
    kind: "email",
    label,
    component: { module: "@shopblok/emails", name },
    contract: EmailView,
  }) as const satisfies EntryInput;

export const emails = [
  email("verify-email", "Verify e-mail", "VerifyEmail"),
  email("password-reset", "Password reset", "PasswordResetEmail"),
  email("order-transfer", "Order transfer", "OrderTransferEmail"),
  email("order-placed", "Order placed", "OrderPlacedEmail"),
  email("order-shipped", "Order shipped", "OrderShippedEmail"),
  email("order-canceled", "Order canceled", "OrderCanceledEmail"),
  email("return-requested", "Return requested", "ReturnRequestedEmail"),
  email("refund-issued", "Refund issued", "RefundIssuedEmail"),
  email("welcome", "Welcome", "WelcomeEmail"),
  email("admin-invite", "Admin invite", "AdminInviteEmail"),
  email("newsletter-confirm", "Newsletter confirmation", "NewsletterConfirmEmail"),
  email("form-message", "Form message", "FormMessageEmail"),
] as const satisfies readonly EntryInput[];
