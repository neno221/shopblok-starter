// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.5 `link`). A section's calls to action in a row that
// wraps: each a button (`default`, `outline`) or a 44 px text link, as the editor's `appearance`
// says. A link to another site opens in a new tab and says so to screen readers. A server
// component.
import type { SectionLink } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Link } from "@shopblok/ui/atoms/link";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type SectionLinksProps = {
  links: readonly SectionLink[];
  /** "Opens in a new tab", from `atoms.link`. */
  newTabLabel: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function SectionLinks({ links, newTabLabel, prefetch, className }: SectionLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul data-slot="section-links" className={cn("flex flex-wrap items-center gap-3", className)}>
      {links.map((link) => {
        const newTab = link.external === true ? { target: "_blank" as const } : {};
        const href = link.href as LinkHref;
        return (
          <li key={`${link.href} ${link.label}`} className="min-w-0 max-w-full">
            {link.appearance === "text" ? (
              <Link
                href={href}
                prefetch={prefetch}
                variant="standalone"
                newTabLabel={newTabLabel}
                className="wrap-anywhere"
                {...newTab}
              >
                {link.label}
              </Link>
            ) : (
              <NextLink
                href={href}
                prefetch={prefetch}
                rel={link.external === true ? "noopener noreferrer" : undefined}
                className={cn(
                  buttonVariants({
                    variant: link.appearance === "outline" ? "outline" : "default",
                  }),
                  "max-w-full wrap-anywhere",
                )}
                {...newTab}
              >
                {link.label}
                {link.external === true ? <VisuallyHidden> ({newTabLabel})</VisuallyHidden> : null}
              </NextLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export { SectionLinks };
export type { SectionLinksProps };
