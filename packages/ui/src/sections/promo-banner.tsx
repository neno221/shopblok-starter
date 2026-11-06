// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `promoBanner` block's entry file: this
// file is what `@shopblok/ui/sections/promo-banner` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./promo-banner/` (`standard.tsx`, M4's, is the first). A
// value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { PromoBannerStandard, type PromoBannerSectionProps } from "./promo-banner/standard";

const MEMBERS: Members<"promo-banner", (props: PromoBannerSectionProps) => React.ReactNode> = {
  standard: PromoBannerStandard,
};

function PromoBannerSection(props: PromoBannerSectionProps) {
  const Member = pickVariant("promo-banner", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { PromoBannerSection };
export type { PromoBannerSectionProps };
