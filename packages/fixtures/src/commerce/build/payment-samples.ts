import type { PaymentMethod, SavedPaymentMethod } from "@shopblok/registry/contracts";
import type { Context } from "../context";
import { fixtureNow } from "../now";

/**
 * The samples of the payment molecules (T34) that the saved cards and methods of the account cannot
 * be: a card that has expired, one that expires this month (still good), the longest holder's name,
 * a card with no holder, and a method with the length of name that breaks a layout. The expiries are
 * worked out from `fixtureNow` (D50), so they stay a month behind it and in it as the fixed now moves.
 */
export function buildPaymentSamples(ctx: Context): {
  expiredCard: SavedPaymentMethod;
  expiringCard: SavedPaymentMethod;
  longHolderCard: SavedPaymentMethod;
  anonymousCard: SavedPaymentMethod;
  longMethod: PaymentMethod;
} {
  const now = new Date(fixtureNow);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const lastMonth =
    month === 1
      ? { expiryMonth: 12, expiryYear: year - 1 }
      : { expiryMonth: month - 1, expiryYear: year };
  const holderName = ctx.ds.ordinary.personName;
  return {
    // Expired the month before the fixed now: works through its last day, so this one has not.
    expiredCard: {
      id: "spm_expired",
      brand: "visa",
      last4: "1881",
      ...lastMonth,
      isDefault: false,
      holderName,
    },
    // Expires in the fixed now's own month: still good until the month ends.
    expiringCard: {
      id: "spm_expiring",
      brand: "mastercard",
      last4: "5100",
      expiryMonth: month,
      expiryYear: year,
      isDefault: false,
      holderName,
    },
    longHolderCard: {
      id: "spm_long_holder",
      brand: "americanexpress",
      last4: "0005",
      expiryMonth: 3,
      expiryYear: year + 3,
      isDefault: true,
      holderName: ctx.ds.long.personName,
    },
    anonymousCard: {
      id: "spm_no_holder",
      brand: "visa",
      last4: "4242",
      expiryMonth: 8,
      expiryYear: year + 2,
      isDefault: false,
    },
    longMethod: {
      id: "pp_long",
      kind: "card",
      name: ctx.ds.long.optionLabel,
      brands: ["visa", "mastercard", "americanexpress"],
    },
  };
}
