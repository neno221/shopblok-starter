// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `hero` block's entry file: this file is
// what `@shopblok/ui/sections/hero` reaches, and it draws the member of the block's `variant`, each
// in its own file in `./hero/` (`standard.tsx`, M4's, is the first). A value the family does not
// have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { HeroStandard, type HeroSectionProps } from "./hero/standard";

const MEMBERS: Members<"hero", (props: HeroSectionProps) => React.ReactNode> = {
  standard: HeroStandard,
};

function HeroSection(props: HeroSectionProps) {
  const Member = pickVariant("hero", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { HeroSection };
export type { HeroSectionProps };
