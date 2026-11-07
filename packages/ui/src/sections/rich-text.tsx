// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `richText` block's entry file: this file
// is what `@shopblok/ui/sections/rich-text` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./rich-text/` (`standard.tsx`, M4's, is the first). A value
// the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { RichTextStandard, type RichTextSectionProps } from "./rich-text/standard";

const MEMBERS: Members<"rich-text", (props: RichTextSectionProps) => React.ReactNode> = {
  standard: RichTextStandard,
};

function RichTextSection(props: RichTextSectionProps) {
  const Member = pickVariant("rich-text", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { RichTextSection };
export type { RichTextSectionProps };
