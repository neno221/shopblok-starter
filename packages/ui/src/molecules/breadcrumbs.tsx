// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). The trail to the current page on
// the breadcrumb primitive: each step a link, the current page text marked `aria-current="page"`
// (not a link: the kit's `role="link"` on it is switched off). From `md` up every step is shown. A
// trail with two steps or more between Home and the parent collapses them below `md` into
// "Home … Parent › Current": the ellipsis stands in for them and says so to a screen reader. A
// reader on a narrow screen does not need the collapsed steps: the parent is always shown (one step
// up is the step they want most) and its own trail shows its ancestors, so every level is a few
// taps away, while a control that opens the hidden steps would make this a client component for
// little. The collapsed links are `display: none` there (not focusable, not read) and in the
// markup at every width. A single step between is not collapsed, because the ellipsis would take
// the room it saves. Long names wrap (`wrap-anywhere`) instead of being cut, so the full name is
// always on screen. Plain `<a>` links, as the primitive draws them, so they are not prefetched. A
// server component: it holds no state and handles no events.
import type { Messages } from "@shopblok/i18n";
import type { Breadcrumbs as BreadcrumbsData } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  type BreadcrumbProps,
} from "@shopblok/ui/primitives/breadcrumb";

type BreadcrumbsProps = Omit<BreadcrumbProps, "label" | "children"> &
  BreadcrumbsData & {
    /** The wording, from the catalog's `molecules.breadcrumbs`. */
    copy: Messages["molecules"]["breadcrumbs"];
  };

/** How many steps between Home and the parent it takes to collapse them below `md`. */
const COLLAPSE_FROM = 2;

function Breadcrumbs({ trail, current, copy, className, ...props }: BreadcrumbsProps) {
  const collapses = trail.length - 2 >= COLLAPSE_FROM;
  return (
    <Breadcrumb label={copy.label} className={className} {...props}>
      <BreadcrumbList>
        {trail.flatMap((step, index) => {
          // The steps that give way below `md`: all but the first and the last of the trail.
          const hide = collapses && index > 0 && index < trail.length - 1;
          return [
            <BreadcrumbItem
              key={`step-${index}`}
              className={cn("max-w-full min-w-0", hide && "max-md:hidden")}
            >
              <BreadcrumbLink href={step.href}>
                <span className="wrap-anywhere">{step.label}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>,
            <BreadcrumbSeparator
              key={`separator-${index}`}
              className={cn(hide && "max-md:hidden")}
            />,
            ...(index === 0 && collapses
              ? [
                  <BreadcrumbItem key="more" className="md:hidden">
                    <BreadcrumbEllipsis label={copy.more} />
                  </BreadcrumbItem>,
                  <BreadcrumbSeparator key="separator-more" className="md:hidden" />,
                ]
              : []),
          ];
        })}
        <BreadcrumbItem className="max-w-full min-w-0">
          <BreadcrumbPage role={undefined} aria-disabled={undefined} className="wrap-anywhere">
            {current}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { Breadcrumbs };
export type { BreadcrumbsProps };
