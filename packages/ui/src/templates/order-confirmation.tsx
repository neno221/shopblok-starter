// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `receipt` family's entry file: what
// `@shopblok/ui/templates/order-confirmation` reaches. It draws the member of the page's `variant`
// (the `templates` global's pick), each in its own file in `./order-confirmation/` (`default.tsx`,
// M3's, is the first), so a page passes the `variant` it read and nothing else changes. A value the
// family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  OrderConfirmationDefault,
  orderConfirmationCopy,
  type OrderConfirmationCopy,
  type OrderConfirmationTemplateProps,
} from "./order-confirmation/default";

const MEMBERS: Members<"receipt", (props: OrderConfirmationTemplateProps) => React.ReactNode> = {
  default: OrderConfirmationDefault,
};

function OrderConfirmationTemplate(props: OrderConfirmationTemplateProps) {
  const Member = pickVariant("receipt", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { OrderConfirmationTemplate, orderConfirmationCopy };
export type { OrderConfirmationCopy, OrderConfirmationTemplateProps };
