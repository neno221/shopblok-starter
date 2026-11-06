// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `editorialList` block's entry file: this
// file is what `@shopblok/ui/sections/editorial-list` reaches, and it draws the member of the
// block's `variant`, each in its own file in `./editorial-list/` (`standard.tsx`, M4's, is the
// first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { EditorialListStandard, type EditorialListSectionProps } from "./editorial-list/standard";

const MEMBERS: Members<"editorial-list", (props: EditorialListSectionProps) => React.ReactNode> = {
  standard: EditorialListStandard,
};

function EditorialListSection(props: EditorialListSectionProps) {
  const Member = pickVariant("editorial-list", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { EditorialListSection };
export type { EditorialListSectionProps };
