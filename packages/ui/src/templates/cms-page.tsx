// Ours (T65, SETUP.md "Pages and the homepage (T65)"; D80, D56). A CMS page's `<main>`: the
// breadcrumbs of a page with parents, the page's title as its one `<h1>`, then its blocks, which
// the shop draws with `RenderBlocks` (each section sets its own width, surface and spacing). A page
// that opens with a hero gives the hero its `<h1>` (`heading: "hero"`): the title is then not
// drawn, so the page still has exactly one. A server component.
import type { Messages } from "@shopblok/i18n";
import type { CmsPage } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import type * as React from "react";

type CmsPageTemplateProps = CmsPage & {
  /** The page's blocks, drawn in order under the title. */
  children?: React.ReactNode;
  /** The breadcrumbs' words, the catalog's `molecules.breadcrumbs`. */
  copy: Messages["molecules"]["breadcrumbs"];
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const container = "mx-auto w-full max-w-7xl min-w-0 px-4 md:px-6 lg:px-8";

function CmsPageTemplate({
  title,
  breadcrumbs,
  heading,
  children,
  copy,
  mainId = "main",
  as: Root = "main",
  className,
}: CmsPageTemplateProps) {
  const head = breadcrumbs !== undefined || heading === "title";
  return (
    <Root
      id={mainId}
      data-slot="cms-page-template"
      data-heading={heading}
      className={cn("flex w-full min-w-0 flex-col pb-12 md:pb-16", className)}
    >
      {head ? (
        <div
          data-slot="cms-page-head"
          className={cn(container, "flex flex-col gap-4 pt-6 md:gap-6 md:pt-8")}
        >
          {breadcrumbs === undefined ? null : <Breadcrumbs {...breadcrumbs} copy={copy} />}
          {heading === "title" ? (
            <h1
              data-slot="cms-page-title"
              className="text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-4xl"
            >
              {title}
            </h1>
          ) : null}
        </div>
      ) : null}
      {children}
    </Root>
  );
}

export { CmsPageTemplate };
export type { CmsPageTemplateProps };
