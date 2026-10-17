import type { z } from "zod";
import type { Money } from "./money";

/** Adds an issue for each amount that is not in `currency`: a cart or an order has one currency. */
export function checkCurrency(
  context: z.RefinementCtx,
  currency: string,
  amounts: [path: (string | number)[], money: Money | undefined][],
): void {
  for (const [path, money] of amounts)
    if (money !== undefined && money.currencyCode !== currency)
      context.addIssue({
        code: "custom",
        path,
        message: `${money.currencyCode} in a ${currency} total`,
      });
}
