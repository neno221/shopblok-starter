// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `faq` block's entry file: this file is
// what `@shopblok/ui/sections/faq` reaches, and it draws the member of the block's `variant`, each
// in its own file in `./faq/` (`standard.tsx`, M4's, is the first). A value the family does not
// have draws the first (`pickVariant`).
// T82 adds `side-heading` (M5 plan §1a).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { FaqSideHeading } from "./faq/side-heading";
import { FaqStandard, type FaqSectionProps } from "./faq/standard";

const MEMBERS: Members<"faq", (props: FaqSectionProps) => React.ReactNode> = {
  standard: FaqStandard,
  "side-heading": FaqSideHeading,
};

function FaqSection(props: FaqSectionProps) {
  const Member = pickVariant("faq", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { FaqSection };
export type { FaqSectionProps };
