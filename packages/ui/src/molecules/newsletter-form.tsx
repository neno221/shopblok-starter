// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). The newsletter signup: a heading
// and a line on what the shopper gets, one email field (labelled, `type="email"`,
// `autocomplete="email"`, required), the consent sentence with a link to the privacy page, and the
// submit button. A plain `<form>` (D48, SPEC §8.4): `action` is what a `<form action>` takes (M3's
// server action, or a URL, which is posted), and the browser validates the address natively, so it
// works before any JavaScript. The four states are a prop: `sending` keeps the button in place and
// named ("Subscribing…") but makes it `type="button"` and `aria-disabled` (Base UI's
// `focusableWhenDisabled`, as ProductCard's quick add does), and puts a disabled submit button first
// in the form, because a form with one text field also submits on Enter and a type="button" alone
// would not stop that; `done` and `error` are text in a `role="status"` region that is always in the
// page, so a change is announced politely (WCAG 4.1.3). The error is also tied to the field
// (`aria-invalid`, `aria-describedby`) and the address is kept: it is the contract's `email`, the
// field's `defaultValue`. The link inside the consent sentence: `formatMessage` returns text, so the
// sentence is one ICU message with a `{privacy}` argument, cut at a slot character that stands in
// for it (as PriceBlock cuts "From {price}"), and the link's own text is another message; a
// language puts the link wherever its sentence needs it. The browser scrolls a long address inside
// the field instead of wrapping it, so the field says so (`data-truncate`, as the Select does). The
// layout is a container query, so the
// field and the button sit on one row when the form is wide, wherever it is placed; it needs a width
// of its own (a block or a flex column, not a shrink-wrapped box). A server component: it only
// formats, and the sending state is the caller's (`useActionState` in M3's wrapper).
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { NewsletterSignup } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { Link } from "@shopblok/ui/atoms/link";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { Field, FieldDescription, FieldLabel } from "@shopblok/ui/primitives/field";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type NewsletterStatus = "idle" | "sending" | "done" | "error";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type NewsletterFormProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "aria-labelledby"
> & {
  /** The address typed so far and the privacy page. */
  newsletter: NewsletterSignup;
  /** The wording, from the catalog's `molecules.newsletterForm`. */
  copy: Messages["molecules"]["newsletterForm"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * What `<form action>` takes: M3's server action, or a URL (the form is then posted). Without
   * one the form submits to the page it is on.
   */
  action?: React.ComponentProps<"form">["action"];
  /** Where the signup is. `sending` blocks a second submit; `done` and `error` say so in text. */
  status?: NewsletterStatus;
  /** The level of the form's heading in the page's outline. */
  headingLevel?: HeadingLevel;
  /**
   * The privacy link's `prefetch` (next/link). Unset, Next prefetches the page's shell in a
   * production build; the design system passes `false` because its pages do not exist before M3.
   */
  prefetch?: boolean | null;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The privacy page's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

// A private-use character no message contains, standing in for the link while the sentence is formatted.
const LINK_SLOT = "";

function NewsletterForm({
  newsletter,
  copy,
  locale,
  action,
  status = "idle",
  headingLevel = 3,
  prefetch,
  className,
  ...props
}: NewsletterFormProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const emailId = `${id}-email`;
  const errorId = `${id}-error`;
  const Heading = `h${headingLevel}` as const;
  const sending = status === "sending";
  const failed = status === "error";
  const [before = "", after = ""] = formatMessage(
    copy.consent,
    { privacy: LINK_SLOT },
    locale,
  ).split(LINK_SLOT);
  return (
    <form
      data-slot="newsletter-form"
      data-status={status}
      action={action}
      // POST unless React owns the submission (a function): a GET would put the email in the URL,
      // and so in history, logs and Referer headers (PR 55 review), also with no `action` at all.
      method={typeof action === "function" ? undefined : "post"}
      aria-labelledby={headingId}
      className={cn("@container flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    >
      {/* Enter in the one text field submits a form with no submit button; a disabled default
          button stops it while a signup is on its way. Hidden, so nobody meets it. */}
      {sending ? <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" /> : null}
      <div className="flex min-w-0 flex-col gap-1">
        <Heading
          id={headingId}
          data-slot="newsletter-form-title"
          className="text-lg leading-snug font-semibold wrap-break-word"
        >
          {copy.title}
        </Heading>
        <p className="text-sm leading-snug wrap-break-word text-muted-foreground">
          {copy.description}
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor={emailId}>{copy.emailLabel}</FieldLabel>
        <div className="flex flex-col gap-2 @md:flex-row @md:items-start">
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            readOnly={sending}
            defaultValue={newsletter.email}
            data-truncate=""
            aria-invalid={failed ? true : undefined}
            aria-describedby={failed ? errorId : undefined}
            className="@md:flex-1"
          />
          <Button
            type={sending ? "button" : "submit"}
            disabled={sending}
            focusableWhenDisabled={sending}
            aria-busy={sending ? true : undefined}
            className="w-full aria-disabled:pointer-events-none aria-disabled:opacity-50 @md:w-auto @md:shrink-0"
          >
            {sending ? <Spinner aria-hidden="true" label={copy.sending} /> : null}
            <span data-slot="newsletter-form-submit-label">
              {sending ? copy.sending : copy.submit}
            </span>
          </Button>
        </div>
        <FieldDescription data-slot="newsletter-form-consent" className="wrap-break-word">
          {before}
          <Link href={newsletter.privacyHref as LinkHref} prefetch={prefetch}>
            {copy.privacyLink}
          </Link>
          {after}
        </FieldDescription>
      </Field>
      <div role="status" aria-live="polite" data-slot="newsletter-form-status">
        {sending ? <VisuallyHidden>{copy.sending}</VisuallyHidden> : null}
        {status === "done" ? (
          <p className="flex items-start gap-2 text-sm leading-snug">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0 wrap-break-word">{copy.done}</span>
          </p>
        ) : null}
        {failed ? (
          <p id={errorId} className="flex items-start gap-2 text-sm leading-snug text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{copy.error}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}

export { NewsletterForm };
export type { NewsletterFormProps, NewsletterStatus };
