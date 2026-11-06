// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `uspBar` block's entry file: this file is
// what `@shopblok/ui/sections/usp-bar` reaches, and it draws the member of the block's `variant`,
// each in its own file in `./usp-bar/` (`standard.tsx`, M4's, is the first). A value the family
// does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { UspBarStandard, uspIcons, type UspBarSectionProps } from "./usp-bar/standard";

const MEMBERS: Members<"usp-bar", (props: UspBarSectionProps) => React.ReactNode> = {
  standard: UspBarStandard,
};

function UspBarSection(props: UspBarSectionProps) {
  const Member = pickVariant("usp-bar", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { UspBarSection, uspIcons };
export type { UspBarSectionProps };
