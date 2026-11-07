// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `checkout` family's entry file:
// what `@shopblok/ui/templates/checkout` reaches. It draws the member of the page's `variant` (the
// `templates` global's pick), each in its own file in `./checkout/` (`default.tsx`, M3's, is the
// first), so a page passes the `variant` it read and nothing else changes. A value the family does
// not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  CheckoutDefault,
  checkoutCopy,
  checkoutIds,
  type CheckoutCopy,
  type CheckoutError,
  type CheckoutErrors,
  type CheckoutTemplateProps,
} from "./checkout/default";

const MEMBERS: Members<"checkout", (props: CheckoutTemplateProps) => React.ReactNode> = {
  default: CheckoutDefault,
};

function CheckoutTemplate(props: CheckoutTemplateProps) {
  const Member = pickVariant("checkout", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { CheckoutTemplate, checkoutCopy, checkoutIds };
export type { CheckoutCopy, CheckoutError, CheckoutErrors, CheckoutTemplateProps };
