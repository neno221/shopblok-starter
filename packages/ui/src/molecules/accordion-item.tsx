// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). One section of the accordion
// primitive: its title is the trigger, inside a heading of the level the page needs (`headingLevel`,
// 3 by default; the primitive's trigger fixes an `h3`, so this builds the header from Base UI's
// parts), and its body is the children. The primitive's `animate-accordion-down/up` classes read
// Radix's height variable and do nothing with Base UI (T31), so the panel's height follows Base
// UI's own `--accordion-panel-height` between 0 and the content's, through `data-starting-style`
// and `data-ending-style`, in 150 ms; under `prefers-reduced-motion` it does not move (the section
// opens at once, and the chevron does not turn gradually). Before the browser measures it the panel
// has `height: auto`, so a section that starts open is open without JavaScript. The trigger is 44 px
// tall at least and fills the row; a long title wraps. A server component: Base UI's parts carry
// their own "use client", so it renders in an `Accordion` (the primitive) that a server page or a
// client one holds. It has no copy: the title and the body are the caller's content.
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import type { AccordionSection } from "@shopblok/registry/contracts";
import { AccordionItem as AccordionItemPrimitive } from "@shopblok/ui/primitives/accordion";
import { ChevronDownIcon } from "lucide-react";
import { createElement, type ReactNode } from "react";

const headings = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

type AccordionItemProps = Omit<
  AccordionPrimitive.Item.Props,
  "value" | "title" | "children" | "render"
> &
  AccordionSection & {
    /** The section's body: shown when it is open. */
    children: ReactNode;
    /** The heading the trigger sits in, so the outline of the page stays right. Default 3. */
    headingLevel?: keyof typeof headings;
  };

function AccordionItem({
  value,
  title,
  headingLevel = 3,
  children,
  className,
  ...props
}: AccordionItemProps) {
  return (
    <AccordionItemPrimitive value={value} className={className} {...props}>
      <AccordionPrimitive.Header
        render={createElement(headings[headingLevel])}
        data-slot="accordion-item-heading"
        className="flex"
      >
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className="group/accordion-trigger relative flex min-h-11 flex-1 items-start justify-between gap-2 rounded-md border border-transparent py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <span className="min-w-0 wrap-anywhere">{title}</span>
          <ChevronDownIcon
            aria-hidden="true"
            data-slot="accordion-item-chevron"
            className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-aria-expanded/accordion-trigger:rotate-180 motion-reduce:transition-none"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Panel
        data-slot="accordion-content"
        className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-150 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      >
        <div className="pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4">
          {children}
        </div>
      </AccordionPrimitive.Panel>
    </AccordionItemPrimitive>
  );
}

export { AccordionItem };
export type { AccordionItemProps };
