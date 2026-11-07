// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `promoBanner` block's entry file: this
// file is what `@shopblok/ui/sections/promo-banner` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./promo-banner/` (`standard.tsx`, M4's, is the first; T82
// adds the other five of M5 plan §1a). A value the family does not have draws the first
// (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { PromoBannerCountdown } from "./promo-banner/countdown";
import { PromoBannerFullBleed } from "./promo-banner/full-bleed";
import type { PromoPopupSlot } from "./promo-banner/parts";
import { PromoBannerPopup } from "./promo-banner/popup";
import { PromoBannerStandard, type PromoBannerSectionProps } from "./promo-banner/standard";
import { PromoBannerStrip } from "./promo-banner/strip";
import { PromoBannerTicket } from "./promo-banner/ticket";

const MEMBERS: Members<"promo-banner", (props: PromoBannerSectionProps) => React.ReactNode> = {
  standard: PromoBannerStandard,
  strip: PromoBannerStrip,
  ticket: PromoBannerTicket,
  "full-bleed": PromoBannerFullBleed,
  countdown: PromoBannerCountdown,
  popup: PromoBannerPopup,
};

function PromoBannerSection(props: PromoBannerSectionProps) {
  const Member = pickVariant("promo-banner", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { PromoBannerSection };
export type { PromoBannerSectionProps, PromoPopupSlot };
