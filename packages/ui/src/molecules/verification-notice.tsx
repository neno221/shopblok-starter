// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The notice that a link was sent
// to an address to verify it: a heading ("Check your email"), the sentence that names the address
// ("We sent a link to ana@example.com. Open it to verify your address.", the address in the semibold
// weight and free to break anywhere, since a long one has nowhere else), a line for the shopper whose
// mail has not come (the spam folder), and the resend action. A plain `<form>` (D48): `action` is
// what a `<form action>` takes (M3's server action, or a URL, which is posted); it is always a POST,
// because a GET would put the address in the URL, and it carries the address in a hidden field, so
// the server knows whom to write to. The wait before a new link can be asked for is
// `resendInSeconds` (the server's cooldown); the button, the line that counts it down and the status
// region are the client part's (`verification-resend.tsx`, which says how), and everything it says
// is formatted here, on the server, and passed in as strings: the sentence about the wait is cut at
// a slot character where the time goes (as PriceBlock cuts "From {price}"), the address is cut into
// its sentence the same way, so a language puts either wherever its grammar needs. The states are a
// prop: `sent` (the first send; the default), `sending` (a new link is on its way: the button is
// pending and submits nothing a second time), `resent` ("We sent a new link.") and `error` ("We could
// not send the email.", with the button still offered once the wait is over; the wait is the
// contract's number, the error does not lift it). Without JavaScript the wait is the number at the
// time of the render and does not run down; a reload asks the server again. Container queries put
// the envelope beside the words from 20 rem of width (above them below it) and the button at its
// natural width from 28 rem, across the notice below it. A server component:
// it only formats; the sending state is the caller's (`useActionState` in M3's wrapper).
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { VerificationRequest } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import {
  VerificationResend,
  type VerificationStatus,
} from "@shopblok/ui/molecules/verification-resend";
import { MailIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type VerificationNoticeProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "aria-labelledby"
> &
  VerificationRequest & {
    /** The wording, from the catalog's `molecules.verificationNotice`. */
    copy: Messages["molecules"]["verificationNotice"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /**
     * What `<form action>` takes: M3's server action, or a URL (the form is then posted). Without
     * one the form is posted to the page it is on.
     */
    action?: React.ComponentProps<"form">["action"];
    /**
     * Where the resend is. `sending` blocks a second submit; `resent` and `error` say so in text.
     */
    status?: VerificationStatus;
    /** The level of the notice's heading in the page's outline. */
    headingLevel?: HeadingLevel;
  };

// A private-use character no message contains, standing in for a value while a sentence is formatted.
const SLOT = "\uE000";

function VerificationNotice({
  email,
  resendInSeconds,
  copy,
  locale,
  action,
  status = "sent",
  headingLevel = 2,
  className,
  ...props
}: VerificationNoticeProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const Heading = `h${headingLevel}` as const;
  const [sentBefore = "", sentAfter = ""] = formatMessage(copy.sent, { email: SLOT }, locale).split(
    SLOT,
  );
  const [cooldownBefore = "", cooldownAfter = ""] = formatMessage(
    copy.cooldown,
    { time: SLOT },
    locale,
  ).split(SLOT);
  return (
    <form
      data-slot="verification-notice"
      data-status={status}
      action={action}
      method={typeof action === "function" ? undefined : "post"}
      aria-labelledby={headingId}
      className={cn(
        "@container flex w-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground",
        className,
      )}
      {...props}
    >
      <input type="hidden" name="email" value={email} />
      <div className="flex min-w-0 flex-col items-start gap-3 @xs:flex-row">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <MailIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            id={headingId}
            data-slot="verification-notice-title"
            className="text-lg leading-snug font-semibold wrap-break-word"
          >
            {copy.title}
          </Heading>
          <p data-slot="verification-notice-sent" className="text-sm leading-snug wrap-break-word">
            {sentBefore}
            <span
              data-slot="verification-notice-email"
              className="font-semibold wrap-anywhere text-foreground"
            >
              {email}
            </span>
            {sentAfter}
          </p>
          <p className="text-sm leading-snug wrap-break-word text-muted-foreground">
            {formatMessage(copy.spam, {}, locale)}
          </p>
        </div>
      </div>
      <VerificationResend
        resendInSeconds={resendInSeconds}
        status={status}
        locale={locale}
        resendLabel={formatMessage(copy.resend, {}, locale)}
        sendingText={formatMessage(copy.sending, {}, locale)}
        resentText={formatMessage(copy.resent, {}, locale)}
        errorText={formatMessage(copy.error, {}, locale)}
        readyText={formatMessage(copy.ready, {}, locale)}
        cooldownBefore={cooldownBefore}
        cooldownAfter={cooldownAfter}
      />
    </form>
  );
}

export { VerificationNotice };
export type { VerificationNoticeProps, VerificationStatus };
