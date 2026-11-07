// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `quick-view` family's entry file:
// what `@shopblok/ui/organisms/quick-view-dialog` reaches. It draws the member of `variant`, each
// in its own file in `./quick-view/` (`default.tsx`, T38's dialog, is the first; `drawer.tsx` and
// `compact.tsx` are T83's; what they share is in `parts.tsx`). The `templates` global's quick view
// is "Off" by default; on, the shop's listing opens it from the `quick-add` card's own trigger
// (`quick-view/trigger.tsx`, T83). A value the family does not have draws the first (`pickVariant`).
import type { VariantOf } from "@shopblok/registry/contracts";
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { QuickViewCompact } from "./quick-view/compact";
import { QuickViewDefault } from "./quick-view/default";
import { QuickViewDrawer } from "./quick-view/drawer";
import type { QuickViewDialogProps as MemberProps } from "./quick-view/parts";

type QuickViewDialogProps = MemberProps & {
  /** The `templates` global's quick view (D101); none draws the first. */
  variant?: VariantOf<"quick-view">;
};

const MEMBERS: Members<"quick-view", (props: MemberProps) => React.ReactNode> = {
  default: QuickViewDefault,
  drawer: QuickViewDrawer,
  compact: QuickViewCompact,
};

function QuickViewDialog({ variant, ...props }: QuickViewDialogProps) {
  const Member = pickVariant("quick-view", MEMBERS, variant);
  return <Member {...props} />;
}

export { QuickViewDialog };
export type { QuickViewDialogProps };
