// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `mediaWithText` block's entry file: this
// file is what `@shopblok/ui/sections/media-with-text` reaches, and it draws the member of the
// block's `variant`, each in its own file in `./media-with-text/` (`standard.tsx`, M4's, is the
// first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { MediaWithTextStandard, type MediaWithTextSectionProps } from "./media-with-text/standard";

const MEMBERS: Members<"media-with-text", (props: MediaWithTextSectionProps) => React.ReactNode> = {
  standard: MediaWithTextStandard,
};

function MediaWithTextSection(props: MediaWithTextSectionProps) {
  const Member = pickVariant("media-with-text", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { MediaWithTextSection };
export type { MediaWithTextSectionProps };
