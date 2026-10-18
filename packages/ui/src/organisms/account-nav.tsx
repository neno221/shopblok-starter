// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, SBP account.md). The
// account's navigation: a `nav` named "Account" around a list of its pages (overview, orders,
// addresses, payment methods, returns, profile: the caller's, with their `href`s), the page the
// customer is on marked `aria-current="page"` and drawn in bold on a filled background (weight and
// fill, not colour alone), and "Sign out" as the submit of a small form of its own (signing out
// changes state, so it is a post, never a link a crawler or a prefetch could follow). From `md` it is
// a column beside the page; below it the pages wrap as a row of 44 px pills above the page, so every
// page is one tap away and nothing scrolls sideways (a sideways scroller would need its own keyboard
// stop, axe's `scrollable-region-focusable`). A server component: it holds no state.
import type { Messages } from "@shopblok/i18n";
import type { AccountNav as AccountNavContent } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import { LogOutIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type AccountNavProps = Omit<React.ComponentProps<"nav">, "children"> &
  AccountNavContent & {
    /** The wording, from the catalog's `organisms.accountNav`. */
    copy: Messages["organisms"]["accountNav"];
    /** The nav's name when a page has two (the design system's states); `copy.label` otherwise. */
    label?: string;
    /** What `<form action>` takes to sign out: M3's server action, or a URL (posted). None: no button. */
    signOutAction?: React.ComponentProps<"form">["action"];
    /** next/link's `prefetch`; the design system passes `false`. */
    prefetch?: boolean | null;
  };

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function AccountNav({
  items,
  current,
  copy,
  label,
  signOutAction,
  prefetch,
  className,
  ...props
}: AccountNavProps) {
  return (
    <nav
      data-slot="account-nav"
      aria-label={label ?? copy.label}
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    >
      <ul role="list" className="flex min-w-0 flex-wrap gap-2 md:flex-col md:gap-1">
        {items.map((item) => {
          const here = item.id === current;
          return (
            <li key={item.id} className="flex max-w-full md:block">
              <NextLink
                href={item.href as LinkHref}
                prefetch={prefetch}
                aria-current={here ? "page" : undefined}
                data-slot="account-nav-link"
                className={cn(
                  "flex min-h-11 max-w-full items-center rounded-full border px-4 text-sm leading-snug wrap-anywhere text-foreground no-underline outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring md:rounded-md md:border-transparent md:px-3",
                  here && "border-primary bg-muted font-semibold md:border-transparent",
                )}
              >
                {item.label}
              </NextLink>
            </li>
          );
        })}
      </ul>
      {signOutAction === undefined ? null : (
        <form
          action={signOutAction}
          method={typeof signOutAction === "function" ? undefined : "post"}
          data-slot="account-nav-sign-out"
          className="flex md:border-t md:pt-2"
        >
          <Button type="submit" variant="ghost" className="max-w-full justify-start">
            <Icon icon={LogOutIcon} />
            <span className="min-w-0 wrap-anywhere">{copy.signOut}</span>
          </Button>
        </form>
      )}
    </nav>
  );
}

export { AccountNav };
export type { AccountNavProps };
