// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `hero` block's entry file: this file is
// what `@shopblok/ui/sections/hero` reaches, and it draws the member of the block's `variant`, each
// in its own file in `./hero/` (`standard.tsx`, M4's, is the first; T80 adds the other seven of
// M5 plan §1a). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { HeroBento } from "./hero/bento";
import { HeroCentered } from "./hero/centered";
import { HeroCollectionSwitcher } from "./hero/collection-switcher";
import { HeroEditorial } from "./hero/editorial";
import { HeroOverlay } from "./hero/overlay";
import { HeroProduct } from "./hero/product";
import { HeroStandard, type HeroSectionProps } from "./hero/standard";
import { HeroText } from "./hero/text";

const MEMBERS: Members<"hero", (props: HeroSectionProps) => React.ReactNode> = {
  standard: HeroStandard,
  overlay: HeroOverlay,
  centered: HeroCentered,
  editorial: HeroEditorial,
  bento: HeroBento,
  "collection-switcher": HeroCollectionSwitcher,
  product: HeroProduct,
  text: HeroText,
};

function HeroSection(props: HeroSectionProps) {
  const Member = pickVariant("hero", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { HeroSection };
export type { HeroSectionProps };
