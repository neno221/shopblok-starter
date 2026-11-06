// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `comparison` block's entry file: this
// file is what `@shopblok/ui/sections/comparison` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./comparison/` (`standard.tsx`, M4's, is the first). A value
// the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { ComparisonStandard, type ComparisonSectionProps } from "./comparison/standard";

const MEMBERS: Members<"comparison", (props: ComparisonSectionProps) => React.ReactNode> = {
  standard: ComparisonStandard,
};

function ComparisonSection(props: ComparisonSectionProps) {
  const Member = pickVariant("comparison", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { ComparisonSection };
export type { ComparisonSectionProps };
