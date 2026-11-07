// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `newsletter` block's entry file: this
// file is what `@shopblok/ui/sections/newsletter` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./newsletter/` (`standard.tsx`, M4's, is the first). A value
// the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { NewsletterStandard, type NewsletterSectionProps } from "./newsletter/standard";

const MEMBERS: Members<"newsletter", (props: NewsletterSectionProps) => React.ReactNode> = {
  standard: NewsletterStandard,
};

function NewsletterSection(props: NewsletterSectionProps) {
  const Member = pickVariant("newsletter", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { NewsletterSection };
export type { NewsletterSectionProps };
