// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `quick-view` family's entry file:
// what `@shopblok/ui/organisms/quick-view-dialog` reaches. It draws the member of `variant`, each
// in its own file in `./quick-view/` (`default.tsx`, T38's dialog, is the first). The `templates`
// global's quick view is "Off" by default, and only T83 opens one from the listing's `quick-add`
// card. A value the family does not have draws the first (`pickVariant`).
import type { VariantOf } from "@shopblok/registry/contracts";
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { QuickViewDefault, type QuickViewDialogProps as MemberProps } from "./quick-view/default";

type QuickViewDialogProps = MemberProps & {
  /** The `templates` global's quick view (D101); none draws the first. */
  variant?: VariantOf<"quick-view">;
};

const MEMBERS: Members<"quick-view", (props: MemberProps) => React.ReactNode> = {
  default: QuickViewDefault,
};

function QuickViewDialog({ variant, ...props }: QuickViewDialogProps) {
  const Member = pickVariant("quick-view", MEMBERS, variant);
  return <Member {...props} />;
}

export { QuickViewDialog };
export type { QuickViewDialogProps };
