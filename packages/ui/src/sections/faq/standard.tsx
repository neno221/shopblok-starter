// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `faq`). Questions that open to their answers, as
// native disclosures (`<details>` and `<summary>`): they open with the keyboard and without
// JavaScript, and the browser's find-in-page opens the one that holds a match. Each question is a
// 44 px row with a chevron that turns when it is open; any number may be open at once. The page's
// FAQs together are its `FAQPage` JSON-LD, which the storefront writes (`RenderBlocks`), not this
// component. A server component. T82 moved the questions to `parts.tsx`, which `side-heading`
// shares.
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { FaqItems, type FaqSectionProps } from "./parts";

function FaqStandard({ settings, heading, items, defaultOpen = [], className }: FaqSectionProps) {
  return (
    <SectionFrame
      data-variant="standard"
      settings={{ ...settings, container: settings?.container ?? "narrow" }}
      slot="faq-section"
      className={className}
      innerClassName="flex flex-col gap-6"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <FaqItems items={items} defaultOpen={defaultOpen} />
    </SectionFrame>
  );
}

export { FaqStandard };
export type { FaqSectionProps };
