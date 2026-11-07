// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `spacer` block's entry file: this file is
// what `@shopblok/ui/sections/spacer` reaches, and it draws the member of the block's `variant`,
// each in its own file in `./spacer/` (`standard.tsx`, M4's, is the first). A value the family does
// not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { SpacerStandard, type SpacerSectionProps } from "./spacer/standard";

const MEMBERS: Members<"spacer", (props: SpacerSectionProps) => React.ReactNode> = {
  standard: SpacerStandard,
};

function SpacerSection(props: SpacerSectionProps) {
  const Member = pickVariant("spacer", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { SpacerSection };
export type { SpacerSectionProps };
