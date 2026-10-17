import type { ShippingEstimate, StepperState } from "@shopblok/registry/contracts";
import { markets } from "../../markets";
import type { Context } from "../context";
import { cartSpec } from "../data/checkout";
import type { CommerceFixture } from "../types";
import { buildAddresses, buildCart, buildShippingOptions } from "./checkout";
import { buildLong } from "./content";
import { buildMarketing } from "./marketing";

// The sample data of OrderSummaryRow, Stepper, ShippingEstimator and VerificationNotice (T34): the
// cart's totals as the rows of a summary, the steps of a flow at each place the reader can be, the
// estimator before and after it has answered, and the email a link was sent to. The amounts, the
// codes and the addresses are the cart's, the address book's and the shipping options' own; only
// the steps' labels are words of the locale (`copy.checkoutFlow`).

/** The steps before `current` are links back to the page of their id. */
function flow(
  ctx: Context,
  steps: readonly (readonly [id: string, label: string, path: string])[],
  current: string,
): StepperState {
  const currentIndex = steps.findIndex(([id]) => id === current);
  return {
    steps: steps.map(([id, label, path], index) => ({
      id,
      label,
      ...(index < currentIndex && { href: ctx.href(path) }),
    })),
    current,
  };
}

export function buildCheckoutFlow(ctx: Context): CommerceFixture["checkoutFlow"] {
  const cart = buildCart(ctx);
  const options = buildShippingOptions(ctx);
  const standard = options.find((option) => option.id === "so_standard");
  if (standard === undefined) throw new Error("the shipping options have no standard delivery");
  const [address] = buildAddresses(ctx);
  if (address?.postalCode === undefined)
    throw new Error("the market's own address has no postal code");
  const { postalCode } = address;
  const { shippingOption: longOption } = buildLong(ctx);
  const marketing = buildMarketing(ctx);
  const { typed, long } = marketing.newsletter;
  const words = ctx.copy.checkoutFlow;

  // The three steps of SPEC §8.4, and the five of a flow that begins at the cart.
  const checkout = [
    ["contact", words.contact, "/checkout/contact"],
    ["delivery", words.deliveryAndPayment, "/checkout/delivery"],
    ["review", words.review, "/checkout/review"],
  ] as const;
  const longer = [
    ["cart", words.cart, "/cart"],
    ["contact", words.contact, "/checkout/contact"],
    ["delivery", words.delivery, "/checkout/delivery"],
    ["payment", words.payment, "/checkout/payment"],
    ["review", words.review, "/checkout/review"],
  ] as const;
  const labels = words.long;
  const longest = [
    ["long-contact", labels[0], "/checkout/contact"],
    ["long-delivery", labels[1], "/checkout/delivery"],
    ["long-payment", labels[2], "/checkout/payment"],
    ["long-review", labels[3], "/checkout/review"],
  ] as const;

  // The region's countries in the select's order: the market's own first, then the other seeded ones.
  const countries = [
    ctx.market.country,
    ...markets.countries
      .filter((country) => country.enabled && country.code !== ctx.market.country)
      .map((country) => country.code),
  ];
  const action = ctx.href("/cart");
  const answered: ShippingEstimate = {
    action,
    countries,
    countryCode: ctx.market.country,
    postalCode,
    options,
  };

  const summary: CommerceFixture["checkoutFlow"]["summary"] = {
    subtotal: { kind: "subtotal", amount: cart.subtotal },
    discount: { kind: "discount", amount: cart.discountTotal, detail: cartSpec.promo.code },
    shippingPending: { kind: "shipping" },
    shippingPaid: { kind: "shipping", amount: standard.price },
    shippingFree: { kind: "shipping", amount: ctx.money(0) },
    // The US price has no tax in it: the sales tax is worked out at checkout.
    tax: cart.taxTotal === undefined ? { kind: "tax" } : { kind: "tax", amount: cart.taxTotal },
    total: { kind: "total", amount: cart.total },
    longDetail: {
      kind: "discount",
      amount: cart.discountTotal,
      detail: marketing.longDiscountCode.code,
    },
    // Seven digits before the decimals, with the grouping the locale puts in.
    large: { kind: "total", amount: ctx.money(1234567.89) },
  };

  return {
    summary,
    steps: {
      contact: flow(ctx, checkout, "contact"),
      delivery: flow(ctx, checkout, "delivery"),
      review: flow(ctx, checkout, "review"),
      five: flow(ctx, longer, "payment"),
      long: flow(ctx, longest, "long-payment"),
    },
    estimator: {
      empty: { action, countries, postalCode: "" },
      single: { action, countries: [ctx.market.country], postalCode: "" },
      answered,
      // A country the shop does not deliver to: the answer is an empty list.
      none: {
        action,
        countries,
        countryCode: "gb",
        postalCode: "M2 5BQ",
        options: [],
      },
      // What a failed lookup hands back: the code the shopper typed, which the server refused.
      mistaken: { action, countries, countryCode: ctx.market.country, postalCode: "12" },
      // A delivery named at the length that breaks a layout, and a pickup.
      long: { ...answered, options: [longOption, ...options.filter((option) => option.pickup)] },
    },
    verification: {
      waiting: { email: typed.email, resendInSeconds: 42 },
      ready: { email: typed.email, resendInSeconds: 0 },
      long: { email: long.email, resendInSeconds: 42 },
    },
  };
}
