// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `testimonials` block's entry file: this
// file is what `@shopblok/ui/sections/testimonials` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./testimonials/` (`standard.tsx`, M4's, is the first). A
// value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { TestimonialsStandard, type TestimonialsSectionProps } from "./testimonials/standard";

const MEMBERS: Members<"testimonials", (props: TestimonialsSectionProps) => React.ReactNode> = {
  standard: TestimonialsStandard,
};

function TestimonialsSection(props: TestimonialsSectionProps) {
  const Member = pickVariant("testimonials", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { TestimonialsSection };
export type { TestimonialsSectionProps };
