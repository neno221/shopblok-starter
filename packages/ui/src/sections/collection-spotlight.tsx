// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `collectionSpotlight` block's entry file:
// this file is what `@shopblok/ui/sections/collection-spotlight` reaches, and it draws the member
// of the block's `variant`, each in its own file in `./collection-spotlight/` (`standard.tsx`,
// M4's, is the first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  CollectionSpotlightStandard,
  type CollectionSpotlightSectionProps,
} from "./collection-spotlight/standard";

const MEMBERS: Members<
  "collection-spotlight",
  (props: CollectionSpotlightSectionProps) => React.ReactNode
> = {
  standard: CollectionSpotlightStandard,
};

function CollectionSpotlightSection(props: CollectionSpotlightSectionProps) {
  const Member = pickVariant("collection-spotlight", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { CollectionSpotlightSection };
export type { CollectionSpotlightSectionProps };
