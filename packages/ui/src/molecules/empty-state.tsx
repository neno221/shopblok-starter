// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). What a page shows when it has
// nothing to list: an optional icon, the title as a heading (`headingLevel`, h2 unless given, so the
// page's outline stays in order), an optional text, and an optional action drawn as a button. The
// icon is a Lucide component (`icon={SearchXIcon}`), decoration only: it is hidden from assistive
// technology, because the title says what the icon shows. The action is a link (`next/link` with the
// Button's classes: Base UI's Button on a link would give it `role="button"`), so it takes `prefetch`
// like every link, and it is the primary button because it is the way on ("Clear all filters").
// Every word comes from the contract: the caller passes its own copy's, so this component has none
// of its own. A server component: it holds no state and handles no events.
import type { LucideIcon } from "lucide-react";
import type { EmptyStateContent } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import type * as React from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type EmptyStateProps = Omit<React.ComponentProps<"div">, "children" | "title"> &
  EmptyStateContent & {
    /** A Lucide icon drawn above the title. Nothing: no icon. */
    icon?: LucideIcon;
    /** The title's heading level: 2 by default. */
    headingLevel?: HeadingLevel;
    /**
     * The action link's `prefetch` (next/link). Unset, Next prefetches its page when it comes into
     * view; the DS page sets `false`, because its sample pages do not exist before M3.
     */
    prefetch?: boolean | null;
  };

// The action's href is a string the app built; `next/link` takes whatever the app's typed routes
// allow, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function EmptyState({
  title,
  text,
  action,
  icon,
  headingLevel = 2,
  prefetch,
  className,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-slot="empty-state"
      className={cn("flex min-w-0 flex-col items-center gap-4 px-4 py-10 text-center", className)}
      {...props}
    >
      {icon === undefined ? null : (
        <span
          data-slot="empty-state-icon"
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon icon={icon} size="xl" />
        </span>
      )}
      <div className="flex max-w-prose min-w-0 flex-col gap-2">
        <Heading
          data-slot="empty-state-title"
          className="text-lg font-semibold text-balance wrap-anywhere"
        >
          {title}
        </Heading>
        {text === undefined ? null : (
          <p
            data-slot="empty-state-text"
            className="text-sm text-balance wrap-anywhere text-muted-foreground"
          >
            {text}
          </p>
        )}
      </div>
      {action === undefined ? null : (
        <NextLink
          href={action.href as LinkHref}
          prefetch={prefetch}
          data-slot="empty-state-action"
          className={cn(buttonVariants(), "max-w-full")}
        >
          {action.label}
        </NextLink>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps, HeadingLevel };
