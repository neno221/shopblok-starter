import type {
  Address,
  Cart,
  CartLine,
  LineOption,
  Order,
  OrderLine,
  PaymentMethod,
  SavedPaymentMethod,
  ShippingOption,
} from "@shopblok/registry/contracts";
import { round2, type Context } from "../context";
import { productSpec } from "../data/catalog";
import {
  type AddressCountry,
  addressBook,
  addressOrder,
  cartSpec,
  customerEmail,
  type LineSpec,
  type OrderSpec,
  orderSpecs,
  paymentMethodSpecs,
  savedCards,
  shippingSpecs,
  storeAddresses,
  vatRates,
} from "../data/checkout";
import { productImages } from "./catalog";

/** The DS market's country, which is one of the four with an address. */
function ownCountry(ctx: Context): AddressCountry {
  const country = addressOrder.find((candidate) => candidate === ctx.market.country);
  if (country === undefined)
    throw new Error(`${ctx.market.country} has no address in the address book`);
  return country;
}

function lineOptions(ctx: Context, line: LineSpec): LineOption[] {
  return [
    { option: ctx.copy.options.colour, value: ctx.colourName(line.colour) },
    { option: ctx.copy.options.size, value: line.size },
  ];
}

/**
 * The VAT inside a gross amount (CY and DE 19 %, CH 8.1 %): `gross × rate / (1 + rate)`. The
 * US has none in the price; its sales tax is worked out at checkout, so there is nothing to show.
 */
function vatIncluded(ctx: Context, gross: number): number | undefined {
  const rate = vatRates[ctx.market.country];
  return rate === undefined ? undefined : round2((gross * rate) / (1 + rate));
}

export function buildCart(ctx: Context): Cart {
  const lines = cartSpec.lines.map((line): CartLine => {
    const spec = productSpec(line.handle);
    const unitPrice = ctx.price(spec.prices);
    const image = productImages(ctx, spec)[0];
    const isLow = line.id === cartSpec.lowStock.lineId;
    return {
      id: line.id,
      productId: spec.id,
      variantId: line.variantId,
      title: ctx.productTitle(line.handle),
      href: ctx.href(`/products/${line.handle}`),
      ...(image !== undefined && { image }),
      options: lineOptions(ctx, line),
      quantity: line.quantity,
      ...(isLow && { maxQuantity: cartSpec.lowStock.stock.quantity }),
      unitPrice,
      ...(spec.compareAt !== undefined && { compareAtUnitPrice: ctx.price(spec.compareAt) }),
      total: ctx.money(round2(unitPrice.amount * line.quantity)),
      stock: isLow ? { ...cartSpec.lowStock.stock } : { status: "in-stock" },
    };
  });
  const subtotal = round2(lines.reduce((sum, line) => sum + line.total.amount, 0));
  const discount = round2(subtotal * cartSpec.promo.rate);
  // No shipping option is chosen yet, so the total is the subtotal less the discount.
  const total = round2(subtotal - discount);
  const tax = vatIncluded(ctx, total);
  const threshold = ctx.price(cartSpec.freeShippingThreshold);
  return {
    id: cartSpec.id,
    currencyCode: ctx.currency,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: ctx.money(subtotal),
    discountTotal: ctx.money(discount),
    ...(tax !== undefined && { taxTotal: ctx.money(tax) }),
    total: ctx.money(total),
    promoCodes: [{ code: cartSpec.promo.code, discount: ctx.money(discount) }],
    freeShipping: { threshold, remaining: ctx.money(round2(threshold.amount - subtotal)) },
  };
}

/** The same four addresses everywhere; the market's own country first, and the default. */
export function buildAddresses(ctx: Context): Address[] {
  const own = ownCountry(ctx);
  return [own, ...addressOrder.filter((country) => country !== own)].map((country) => ({
    ...addressBook[country],
    isDefaultShipping: country === own,
    isDefaultBilling: country === own,
  }));
}

function buildOrder(ctx: Context, spec: OrderSpec, address: Address): Order {
  const lines = spec.lines.map((line): OrderLine => {
    const product = productSpec(line.handle);
    const unitPrice = ctx.price(product.prices);
    const image = productImages(ctx, product)[0];
    return {
      id: line.id,
      title: ctx.productTitle(line.handle),
      href: ctx.href(`/products/${line.handle}`),
      ...(image !== undefined && { image }),
      options: lineOptions(ctx, line),
      quantity: line.quantity,
      unitPrice,
      total: ctx.money(round2(unitPrice.amount * line.quantity)),
    };
  });
  const method = shippingSpecs.find((candidate) => candidate.key === spec.shipping);
  if (method === undefined) throw new Error(`There is no shipping option ${spec.shipping}`);
  const subtotal = round2(lines.reduce((sum, line) => sum + line.total.amount, 0));
  const discount = round2(subtotal * spec.discountRate);
  const shipping = ctx.price(method.prices);
  const total = round2(subtotal - discount + shipping.amount);
  const placed = spec.events[0];
  if (placed === undefined) throw new Error(`Order ${spec.id} has no events`);
  return {
    id: spec.id,
    displayId: spec.displayId,
    email: customerEmail,
    placedAt: placed.at,
    status: spec.status,
    currencyCode: ctx.currency,
    lines,
    subtotal: ctx.money(subtotal),
    discountTotal: ctx.money(discount),
    shippingTotal: shipping,
    // VAT is in the EU and Swiss prices; the US price has none in it (sales tax is added later).
    taxTotal: ctx.money(vatIncluded(ctx, total) ?? 0),
    total: ctx.money(total),
    shippingAddress: address,
    billingAddress: address,
    shippingMethod: { name: ctx.copy.shipping[spec.shipping], price: shipping },
    payment: { ...spec.payment },
    events: spec.events.map((event) => ({ ...event })),
  };
}

export function buildOrders(ctx: Context, addresses: Address[]): Order[] {
  const address = addresses[0];
  if (address === undefined) throw new Error("The address book is empty");
  return orderSpecs.map((spec) => buildOrder(ctx, spec, { ...address }));
}

export function buildPaymentMethods(ctx: Context): PaymentMethod[] {
  return paymentMethodSpecs.map(({ name, ...method }) => ({
    ...method,
    name: name ?? ctx.copy.card,
    brands: [...method.brands],
  }));
}

export function buildSavedPaymentMethods(ctx: Context): SavedPaymentMethod[] {
  return savedCards.map((card) => ({ ...card, holderName: ctx.ds.ordinary.personName }));
}

export function buildShippingOptions(ctx: Context): ShippingOption[] {
  const store = storeAddresses[ownCountry(ctx)];
  return shippingSpecs.map((spec) => ({
    id: spec.id,
    name: ctx.copy.shipping[spec.key],
    price: ctx.price(spec.prices),
    estimate: { ...spec.estimate },
    ...(spec.key === "pickup" && {
      pickup: { locationName: ctx.copy.shipping.storeName, address: { ...store } },
    }),
    available: spec.available,
  }));
}
