// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `recentlyViewed` block's entry file: this
// file is what `@shopblok/ui/sections/recently-viewed` reaches, and it draws the member of the
// block's `variant`, each in its own file in `./recently-viewed/` (`standard.tsx`, M4's, is the
// first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  RecentlyViewedStandard,
  type RecentlyViewedSectionProps,
} from "./recently-viewed/standard";

const MEMBERS: Members<"recently-viewed", (props: RecentlyViewedSectionProps) => React.ReactNode> =
  {
    standard: RecentlyViewedStandard,
  };

function RecentlyViewedSection(props: RecentlyViewedSectionProps) {
  const Member = pickVariant("recently-viewed", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { RecentlyViewedSection };
export type { RecentlyViewedSectionProps };
