// Ours (T53, SETUP.md "Auth and account (T53)"; D64, SPEC §8.4). The claim of a guest order's
// `<main>`: one narrow column with its `<h1>`.
// - **Lookup:** for a signed-in customer, the receipt's number and the e-mail the order was placed
//   with; once sent, the status that the order's address has the link (it never says whether the
//   details matched an order), and the way back to the account.
// - **Sign in:** a visitor who is not signed in learns that claiming needs a verified account.
// - **Transfer:** the e-mail link's page: accept or decline, two buttons of one form (the action
//   reads which was pressed), so it posts without scripts and nothing changes on a mere visit.
// - **Done:** what became of it, and the way back to the shop.
// An action's failure comes back as `errors`. A server component.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { OrderLookupPage } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import type * as React from "react";
import { FormAlert, FormStatus, TextField } from "./form-parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FormAction = React.ComponentProps<"form">["action"];

type OrderLookupCopy = Messages["templates"]["orderLookup"];

/** The claim's words from a whole catalog. */
function orderLookupCopy(messages: Messages): OrderLookupCopy {
  return messages.templates.orderLookup;
}

/** What the claim's action answered: the form's error, and each field's. */
type OrderLookupErrors = {
  form?: keyof OrderLookupCopy["formErrors"];
  number?: "required" | "invalid";
  email?: "required" | "pattern";
};

type OrderLookupTemplateProps = OrderLookupPage & {
  copy: OrderLookupCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The lookup's action, or the transfer's (it reads `decision`: `accept` or `decline`). */
  action?: FormAction;
  errors?: OrderLookupErrors;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const linkClass =
  "font-medium text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring";
// A link on a line of its own is a control, so its row is 44 px high (D32); a link inside a
// sentence keeps the sentence's line.
const ownLineLinkClass = cn(linkClass, "inline-flex min-h-11 max-w-full items-center");

function OrderLookupTemplate({
  screen,
  copy,
  locale,
  action,
  errors = {},
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: OrderLookupTemplateProps) {
  const title =
    screen.kind === "transfer"
      ? formatMessage(copy.transfer.title, { number: String(screen.displayId) }, locale)
      : copy.title;
  const numberError =
    errors.number === undefined
      ? undefined
      : errors.number === "required"
        ? formatMessage(copy.errors.required, { field: copy.number }, locale)
        : copy.errors.number;
  const emailError =
    errors.email === undefined
      ? undefined
      : errors.email === "required"
        ? formatMessage(copy.errors.required, { field: copy.email }, locale)
        : copy.errors.pattern;
  return (
    <Root
      id={mainId}
      data-slot="order-lookup-template"
      data-variant="default"
      data-screen={screen.kind}
      className={cn(
        "mx-auto flex w-full max-w-xl min-w-0 flex-col gap-6 px-4 py-8 md:py-12",
        className,
      )}
    >
      <h1 className="text-2xl leading-tight font-semibold wrap-break-word md:text-3xl">{title}</h1>
      {errors.form === undefined ? null : (
        <FormAlert slot="order-lookup-error">{copy.formErrors[errors.form]}</FormAlert>
      )}
      {screen.kind === "lookup" ? (
        <>
          <p className="text-muted-foreground wrap-break-word">{copy.lead}</p>
          {screen.sent ? <FormStatus slot="order-lookup-sent">{copy.sent}</FormStatus> : null}
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            data-slot="order-lookup-form"
            aria-label={copy.title}
            className="flex min-w-0 flex-col gap-4"
          >
            <TextField
              id={`${mainId}-number`}
              name="number"
              label={copy.number}
              hint={copy.numberHint}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required
              defaultValue={screen.values.number}
              error={numberError}
            />
            <TextField
              id={`${mainId}-email`}
              name="email"
              label={copy.email}
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              required
              defaultValue={screen.values.email}
              error={emailError}
            />
            <Button type="submit" size="lg" className="max-w-full self-start">
              {copy.submit}
            </Button>
          </form>
          <NextLink
            href={screen.accountHref as LinkHref}
            prefetch={prefetch}
            data-slot="order-lookup-account"
            className={cn(ownLineLinkClass, "self-start text-sm")}
          >
            {copy.account}
          </NextLink>
        </>
      ) : screen.kind === "sign-in" ? (
        <>
          <p className="wrap-break-word">{copy.signIn.text}</p>
          <div className="flex min-w-0 flex-wrap gap-3">
            <NextLink
              href={screen.loginHref as LinkHref}
              prefetch={prefetch}
              data-slot="order-lookup-login"
              className={cn(buttonVariants({ size: "lg" }), "max-w-full")}
            >
              {copy.signIn.login}
            </NextLink>
            <NextLink
              href={screen.registerHref as LinkHref}
              prefetch={prefetch}
              data-slot="order-lookup-register"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-w-full")}
            >
              {copy.signIn.register}
            </NextLink>
          </div>
        </>
      ) : screen.kind === "transfer" ? (
        <>
          <p className="wrap-break-word">{copy.transfer.lead}</p>
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            data-slot="order-transfer-form"
            aria-label={title}
            className="flex min-w-0 flex-wrap gap-3"
          >
            <Button type="submit" name="decision" value="accept" size="lg" className="max-w-full">
              {copy.transfer.accept}
            </Button>
            <Button
              type="submit"
              name="decision"
              value="decline"
              variant="outline"
              size="lg"
              className="max-w-full"
            >
              {copy.transfer.decline}
            </Button>
          </form>
        </>
      ) : (
        <>
          {screen.outcome === "failed" ? (
            <FormAlert slot="order-transfer-failed">{copy.done.failed}</FormAlert>
          ) : (
            <FormStatus slot="order-transfer-done">{copy.done[screen.outcome]}</FormStatus>
          )}
          <NextLink
            href={screen.homeHref as LinkHref}
            prefetch={prefetch}
            data-slot="order-transfer-home"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "max-w-full self-start",
            )}
          >
            {copy.done.home}
          </NextLink>
        </>
      )}
    </Root>
  );
}

export { OrderLookupTemplate, orderLookupCopy };
export type { OrderLookupCopy, OrderLookupErrors, OrderLookupTemplateProps };
