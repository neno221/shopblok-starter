// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `faq`). Questions that open to their answers, as
// native disclosures (`<details>` and `<summary>`): they open with the keyboard and without
// JavaScript, and the browser's find-in-page opens the one that holds a match. Each question is a
// 44 px row with a chevron that turns when it is open; any number may be open at once. The page's
// FAQs together are its `FAQPage` JSON-LD, which the storefront writes (`RenderBlocks`), not this
// component. A server component.
import type { FaqSection as FaqSectionData } from "@shopblok/registry/contracts";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { ChevronDownIcon } from "lucide-react";

type FaqSectionProps = FaqSectionData & {
  /** The questions open at first (their `value`s); none by default. */
  defaultOpen?: readonly string[];
  className?: string;
};

function FaqSection({ settings, heading, items, defaultOpen = [], className }: FaqSectionProps) {
  return (
    <SectionFrame
      settings={{ ...settings, container: settings?.container ?? "narrow" }}
      slot="faq-section"
      className={className}
      innerClassName="flex flex-col gap-6"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <div className="flex flex-col border-t">
        {items.map((item) => (
          <details
            key={item.value}
            data-slot="faq-item"
            open={defaultOpen.includes(item.value)}
            className="group/faq border-b"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 rounded-md py-4 text-start font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 wrap-anywhere">{item.title}</span>
              <ChevronDownIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open/faq:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="flex flex-col gap-4 pb-4">
              {item.answer.map((paragraph, index) => (
                <p key={index} className="wrap-anywhere">
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </SectionFrame>
  );
}

export { FaqSection };
export type { FaqSectionProps };
