// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `richText`). The editor's text in the page's
// column: the text is the section's children, which the storefront renders from Lexical (Payload's
// `RichText`, its internal links resolved for the market), so this package never sees Payload. A
// server component.
import type { RichTextSection as RichTextSectionData } from "@shopblok/registry/contracts";
import type * as React from "react";
import { Prose } from "@shopblok/ui/sections/prose";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";

type RichTextSectionProps = RichTextSectionData & {
  /** The text: headings, paragraphs, lists, links. */
  children: React.ReactNode;
  className?: string;
};

function RichTextSection({ settings, children, className }: RichTextSectionProps) {
  return (
    <SectionFrame settings={settings} slot="rich-text-section" className={className}>
      <Prose>{children}</Prose>
    </SectionFrame>
  );
}

export { RichTextSection };
export type { RichTextSectionProps };
