// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D42; SBP layouts/
// product-details.md). A product's information in sections that open and close: its description,
// its details, delivery and returns (the product gives the first two, the shop the others). A
// server component: the Accordion primitive and the AccordionItem molecule carry Base UI's client
// parts, so the page needs no client code of ours, and every word is a section's content.
// - Accordions at every width. SBP shows tabs on desktop, but tabs show one section and hide the
//   rest from find-in-page and from a reader who skims, and the product page's right column is
//   narrow, so a row of tab labels would wrap or be cut there. The same accordion as on a phone
//   keeps every title in view and lets a reader open as many as they like.
// - Several sections can be open at once (`multiple`), and the ones that are not open are still in
//   the page (`keepMounted`): every section's text is in the HTML that a search engine reads and
//   that find-in-page searches. Not `hiddenUntilFound`: once a script asks for a closed panel's
//   box, Chrome lays out the content that `until-found` skips, and the panel's `overflow-hidden`
//   then reports clipping (SETUP.md, "Footers and site organisms (T36)"). The cost is that
//   find-in-page does not open a closed section by itself.
// - `defaultOpen` lists the sections open at first by id; left out, the first one is. A section
//   that starts open is open without JavaScript (the panel's height is `auto` until the browser
//   measures it, see AccordionItem); a closed one needs the script to open, like every accordion.
// - The whole thing is a `<section>` named by the catalog's `label` (a region landmark), and each
//   section's title is a button inside a heading of `headingLevel` (2 by default), as AccordionItem
//   draws it, so the page's outline has the information under its own `h2`.
// - The blocks: `text` is paragraphs at a readable measure; `list` is a bulleted `<ul>`; `facts` is
//   a `<dl>` of labels and values, two columns from `sm` and stacked below, wrapping long words;
//   `link` is a next/link at least 44 px tall, on a line of its own and not in a sentence. A link
//   the contract marks `external` stays in the same tab: the catalog has no "opens in a new tab"
//   note for it (the announcement bar makes the same choice). Every link takes `prefetch` from the
//   prop. `locale` is part of the props every organism takes; nothing here formats a number or a
//   date, so it is not used.
import type { Messages } from "@shopblok/i18n";
import type { ProductInfo, ProductInfoBlock } from "@shopblok/registry/contracts";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import { AccordionItem } from "@shopblok/ui/molecules/accordion-item";
import { Accordion } from "@shopblok/ui/primitives/accordion";
import type * as React from "react";

type ProductInfoAccordionsProps = ProductInfo & {
  /** The wording, from the catalog's `organisms.productInfoAccordions`. */
  copy: Messages["organisms"]["productInfoAccordions"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The sections open at first, by id (the first one when left out). */
  defaultOpen?: string[];
  /** The sections' heading level (2 by default; the design system's states sit under an h3 and use 4). */
  headingLevel?: 2 | 3 | 4;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

// A link's href is a string the app built; `next/link` takes whatever the app's typed routes
// allow, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

function Block({
  block,
  prefetch,
}: {
  block: ProductInfoBlock;
  prefetch: boolean | null | undefined;
}) {
  switch (block.kind) {
    case "text":
      return (
        // The molecule's body puts 1 rem under every paragraph but the last, so no gap here.
        <div data-slot="product-info-text" className="max-w-prose">
          {block.paragraphs.map((paragraph, index) => (
            <p key={index} className="leading-relaxed wrap-anywhere">
              {paragraph}
            </p>
          ))}
        </div>
      );
    case "list":
      return (
        <ul
          data-slot="product-info-list"
          className="flex max-w-prose list-disc flex-col gap-1.5 ps-5 marker:text-muted-foreground"
        >
          {block.items.map((item, index) => (
            <li key={index} className="leading-relaxed wrap-anywhere">
              {item}
            </li>
          ))}
        </ul>
      );
    case "facts":
      // A row is a subgrid of the list's two columns from `sm`, so every label and value line up
      // down the list whatever their length; below `sm` each row is its label over its value.
      return (
        <dl
          data-slot="product-info-facts"
          className="grid max-w-prose grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
        >
          {block.rows.map((row, index) => (
            <div key={index} className="grid gap-0.5 sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-6">
              <dt className="font-medium wrap-anywhere text-muted-foreground">{row.label}</dt>
              <dd className="wrap-anywhere">{row.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "link":
      return (
        <Link
          href={block.link.href as LinkHref}
          prefetch={prefetch}
          variant="standalone"
          data-slot="product-info-link"
          className="w-fit min-w-11 max-w-full wrap-anywhere"
        >
          {block.link.label}
        </Link>
      );
  }
}

function ProductInfoAccordions({
  sections,
  copy,
  defaultOpen,
  headingLevel = 2,
  prefetch,
  className,
}: ProductInfoAccordionsProps) {
  const open = defaultOpen ?? sections.slice(0, 1).map((section) => section.id);
  return (
    <section
      aria-label={copy.label}
      data-slot="product-info-accordions"
      className={cn("min-w-0", className)}
    >
      <Accordion multiple keepMounted defaultValue={open}>
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            title={section.title}
            headingLevel={headingLevel}
          >
            <div className="flex flex-col gap-4">
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} prefetch={prefetch} />
              ))}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export { ProductInfoAccordions };
export type { ProductInfoAccordionsProps };
