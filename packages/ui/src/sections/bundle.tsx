// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `bundle` block's entry file: this file is
// what `@shopblok/ui/sections/bundle` reaches, and it draws the member of the block's `variant`,
// each in its own file in `./bundle/` (`standard.tsx`, M4's, is the first). A value the family does
// not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { BundleStandard, type BundleSectionProps } from "./bundle/standard";

const MEMBERS: Members<"bundle", (props: BundleSectionProps) => React.ReactNode> = {
  standard: BundleStandard,
};

function BundleSection(props: BundleSectionProps) {
  const Member = pickVariant("bundle", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { BundleSection };
export type { BundleSectionProps };
