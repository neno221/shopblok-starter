// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `receipt` family's entry file: what
// `@shopblok/ui/templates/order-confirmation` reaches. It draws the member of the page's `variant`
// (the `templates` global's pick), each in its own file in `./order-confirmation/` (`default.tsx`,
// M3's, is the first; T86 adds `statement`, `timeline-first`, `split`, `compact` and `next-steps`,
// their shared parts in `parts.tsx`), so a page passes the `variant` it read and nothing else
// changes. A value the family does not have draws the first (`pickVariant`). The account's order
// screen draws the same members with `account` (T86), except `default`, which it draws as M3 did.
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  OrderConfirmationDefault,
  orderConfirmationCopy,
  type OrderConfirmationCopy,
  type OrderConfirmationTemplateProps,
} from "./order-confirmation/default";
import { OrderConfirmationCompact } from "./order-confirmation/compact";
import { OrderConfirmationNextSteps } from "./order-confirmation/next-steps";
import type { ReceiptOnAccount } from "./order-confirmation/parts";
import { OrderConfirmationSplit } from "./order-confirmation/split";
import { OrderConfirmationStatement } from "./order-confirmation/statement";
import { OrderConfirmationTimelineFirst } from "./order-confirmation/timeline-first";

const MEMBERS: Members<"receipt", (props: OrderConfirmationTemplateProps) => React.ReactNode> = {
  default: OrderConfirmationDefault,
  statement: OrderConfirmationStatement,
  "timeline-first": OrderConfirmationTimelineFirst,
  split: OrderConfirmationSplit,
  compact: OrderConfirmationCompact,
  "next-steps": OrderConfirmationNextSteps,
};

function OrderConfirmationTemplate(props: OrderConfirmationTemplateProps) {
  const Member = pickVariant("receipt", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { OrderConfirmationTemplate, orderConfirmationCopy };
export type { OrderConfirmationCopy, OrderConfirmationTemplateProps, ReceiptOnAccount };
