import { formatMessage, type Messages } from "@shopblok/i18n";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { FormAlert, FormStatus } from "@shopblok/ui/templates/form-parts";
import NextLink from "next/link";
import type * as React from "react";

// The newsletter's confirmation page's `<main>` (D122, T99), in the auth pages' narrow column
// (AuthTemplate's): the address and a "Confirm" form that posts the link's token, or what became
// of it. A plain form, so it posts without scripts; a server component. It is the shop's own page,
// not a design-system entry: its parts are DS atoms (Button, FormAlert, FormStatus).

type Copy = Messages["templates"]["newsletterConfirm"];
type FormAction = React.ComponentProps<"form">["action"];
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

export type ConfirmScreen =
  | { kind: "confirm"; email: string; token: string; failed?: boolean }
  | { kind: "done" }
  | { kind: "used" }
  | { kind: "expired" };

export function NewsletterConfirm({
  screen,
  copy,
  locale,
  action,
  homeHref,
  prefetch,
}: {
  screen: ConfirmScreen;
  copy: Copy;
  locale: string;
  action: FormAction;
  homeHref: string;
  prefetch?: boolean | null;
}) {
  const title =
    screen.kind === "confirm"
      ? copy.title
      : screen.kind === "done"
        ? copy.doneTitle
        : screen.kind === "used"
          ? copy.usedTitle
          : copy.expiredTitle;
  const home = (
    <NextLink
      href={homeHref as LinkHref}
      prefetch={prefetch}
      data-slot="newsletter-confirm-home"
      className={cn(buttonVariants({ size: "lg", variant: "outline" }), "max-w-full self-start")}
    >
      {copy.home}
    </NextLink>
  );
  return (
    <main
      id="main"
      data-slot="newsletter-confirm"
      data-screen={screen.kind}
      className="mx-auto flex w-full max-w-md min-w-0 flex-col gap-6 px-4 py-8 md:py-12"
    >
      <h1 className="text-2xl leading-tight font-semibold wrap-break-word md:text-3xl">{title}</h1>
      {screen.kind === "confirm" ? (
        <>
          {screen.failed ? (
            <FormAlert slot="newsletter-confirm-error">{copy.failed}</FormAlert>
          ) : null}
          <p className="text-muted-foreground wrap-anywhere">
            {formatMessage(copy.lead, { email: screen.email }, locale)}
          </p>
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            aria-label={copy.title}
            className="flex min-w-0 flex-col gap-4"
          >
            <input type="hidden" name="token" value={screen.token} />
            <Button type="submit" size="lg" className="max-w-full self-start">
              {copy.submit}
            </Button>
          </form>
        </>
      ) : screen.kind === "done" ? (
        <>
          <FormStatus slot="newsletter-confirm-done">{copy.done}</FormStatus>
          {home}
        </>
      ) : (
        <>
          <p className="wrap-break-word">{screen.kind === "used" ? copy.used : copy.expired}</p>
          {home}
        </>
      )}
    </main>
  );
}
