// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The FAQ's
// `side-heading` member: from `lg` the heading in a column of its own, held in view while the
// questions beside it scroll past (`sticky`, under the header's height), and the questions in the
// two columns after it; below `lg` the heading comes first, as the first member draws it. The
// questions are the first member's native disclosures. Like every FAQ, its questions join the
// page's one `FAQPage` JSON-LD, which the storefront writes (`RenderBlocks`), not this component.
// A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { FaqItems, type FaqSectionProps } from "./parts";

function FaqSideHeading({
  settings,
  heading,
  items,
  defaultOpen = [],
  className,
}: FaqSectionProps) {
  return (
    <SectionFrame
      data-variant="side-heading"
      settings={settings}
      slot="faq-section"
      className={className}
      innerClassName={cn("grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-12")}
    >
      {heading === undefined ? null : (
        <div className="min-w-0">
          <SectionHeading className="lg:sticky lg:top-24">{heading}</SectionHeading>
        </div>
      )}
      <div className={cn("min-w-0", heading === undefined ? "lg:col-span-3" : "lg:col-span-2")}>
        <FaqItems items={items} defaultOpen={defaultOpen} />
      </div>
    </SectionFrame>
  );
}

export { FaqSideHeading };
