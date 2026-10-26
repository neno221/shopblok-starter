// Ours (T48, SETUP.md "The shell (T48)"; D56, SPEC §9.3). The error page's `<main>`: "Something went
// wrong", a sentence that says what to do and nothing about the error (a server error's message
// never reaches the browser, and its digest means nothing to a shopper), "Try again" and the home
// page. "Try again" is the page's `retry` slot, because only the error boundary can retry (its
// `retry()`); the design system draws the button without a handler. The words are the catalog's
// `templates.error`.
import type { Messages } from "@shopblok/i18n";
import type { ErrorPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { TriangleAlertIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";
import { StatusPage } from "./status-page";

type ErrorTemplateProps = ErrorPage & {
  copy: Messages["templates"]["error"];
  /** "Try again", the primary button: the error boundary's (it calls `retry()`). Nothing: no button. */
  retry?: React.ReactNode;
  prefetch?: boolean | null;
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function ErrorTemplate({
  homeHref,
  copy,
  retry,
  prefetch,
  mainId,
  as,
  className,
}: ErrorTemplateProps) {
  return (
    <StatusPage
      slot="error-template"
      icon={TriangleAlertIcon}
      title={copy.title}
      body={copy.body}
      alert
      mainId={mainId}
      as={as}
      className={className}
    >
      {retry}
      <NextLink
        href={homeHref as LinkHref}
        prefetch={prefetch}
        data-slot="error-home"
        className={cn(
          buttonVariants({ variant: retry === undefined ? "default" : "outline", size: "lg" }),
          "max-w-full wrap-anywhere",
        )}
      >
        {copy.home}
      </NextLink>
    </StatusPage>
  );
}

export { ErrorTemplate };
export type { ErrorTemplateProps };
