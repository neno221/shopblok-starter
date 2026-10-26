// Ours (T48, SETUP.md "The shell (T48)"; D56, SBP static-pages.md). What the not-found and the error
// templates share: the page's `<main>` (the skip link's target, `main` unless given), a decorative
// icon, the page's one `<h1>`, a sentence, and the ways on as buttons. The first way on is the
// primary button. A template is the page between the header and the footer, which the layout
// draws. No hooks and no handlers, so a server page and a client error boundary can both render it.
import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

type StatusPageProps = {
  slot: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** The ways on, in order: links or buttons drawn with the Button's classes. */
  children: React.ReactNode;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /**
   * `div` for a page that has its `<main>` already: the design system, whose frame is one. A
   * shop's page leaves it, so the template is the page's one `<main>`.
   */
  as?: "main" | "div";
  className?: string;
};

function StatusPage({
  slot,
  icon,
  title,
  body,
  children,
  mainId,
  as: Element = "main",
  className,
}: StatusPageProps) {
  return (
    <Element
      id={mainId ?? "main"}
      data-slot={slot}
      className={cn(
        "mx-auto flex w-full max-w-page flex-1 flex-col px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-prose min-w-0 flex-col items-center gap-6 py-16 text-center sm:py-24">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon icon={icon} size="xl" />
        </span>
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-2xl font-semibold text-balance wrap-anywhere sm:text-3xl">{title}</h1>
          <p className="text-base text-balance wrap-anywhere text-muted-foreground">{body}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      </div>
    </Element>
  );
}

export { StatusPage };
export type { StatusPageProps };
