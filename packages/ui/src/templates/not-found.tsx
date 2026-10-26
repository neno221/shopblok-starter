// Ours (T48, SETUP.md "The shell (T48)"; D56, SPEC §9.3, SBP static-pages.md). The 404 page's
// `<main>`: "Page not found", a sentence, and the ways on: the home page (the primary button) and,
// when the shop has one, the search page. The words are the catalog's `templates.notFound`.
import type { Messages } from "@shopblok/i18n";
import type { NotFoundPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { SearchXIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";
import { StatusPage } from "./status-page";

type NotFoundTemplateProps = NotFoundPage & {
  copy: Messages["templates"]["notFound"];
  /** next/link's `prefetch` for the links; the design system passes `false`. */
  prefetch?: boolean | null;
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

type LinkHref = React.ComponentProps<typeof NextLink>["href"];

const WAY = "max-w-full wrap-anywhere";

function NotFoundTemplate({
  homeHref,
  searchHref,
  copy,
  prefetch,
  mainId,
  as,
  className,
}: NotFoundTemplateProps) {
  return (
    <StatusPage
      slot="not-found-template"
      icon={SearchXIcon}
      title={copy.title}
      body={copy.body}
      mainId={mainId}
      as={as}
      className={className}
    >
      <NextLink
        href={homeHref as LinkHref}
        prefetch={prefetch}
        data-slot="not-found-home"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), WAY)}
      >
        {copy.home}
      </NextLink>
      {searchHref === undefined ? null : (
        <NextLink
          href={searchHref as LinkHref}
          prefetch={prefetch}
          data-slot="not-found-search"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), WAY)}
        >
          {copy.search}
        </NextLink>
      )}
    </StatusPage>
  );
}

export { NotFoundTemplate };
export type { NotFoundTemplateProps };
