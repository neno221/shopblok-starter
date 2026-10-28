import "server-only";
import { z } from "zod";
import { mailTarget } from "../markets";
import {
  addAddress,
  deleteAddress,
  updateAddress,
  updateCustomer,
  type CustomerDto,
} from "../medusa/customer";
import {
  acceptOrderTransfer,
  claimOrder,
  createCustomerReturn,
  declineOrderTransfer,
  getOrder,
  listReturnReasons,
  returnableOf,
} from "../medusa/orders";
import { MedusaRequestError } from "../medusa/sdk";
import { toAddressInput } from "../view-models/address";
import { action, ActionError, FieldsError } from "./action";
import { contextFor, formText as text, marketKey } from "./inputs";
import { addressErrors, keepFormatFields } from "./checkout-handlers";

// The account's actions (D64, T53): each runs for the signed-in customer only (`auth: "customer"`,
// the JWT cookie read again now) and checks that what the form names is theirs before Medusa sees
// it (SPEC §11.1): an address id against the customer's own addresses, an order id against the
// customer's own orders (`getOrder`). Medusa scopes `/store/customers/me/*` to the token as well;
// the check here is so the refusal never rests on Medusa alone. The guest-order claim and the
// transfer link's answer are here too.

const id = z.string().min(1).max(128);
/** The customer's own address, or the refusal a stranger's id gets. */
function ownAddress(customer: CustomerDto, addressId: string) {
  const address = customer.addresses.find((each) => each.id === addressId);
  if (address === undefined) throw new ActionError("not-found", "not the customer's address");
  return address;
}

// --- The profile ----------------------------------------------------------------------------------

export const profileSchema = z.object({
  market: marketKey,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: text(40),
});

/** The name and the phone; an empty phone clears it. The e-mail is the sign-in and stays. */
export const saveProfileAction = action(
  profileSchema,
  async ({ market, firstName, lastName, phone }) => {
    await contextFor(market);
    await updateCustomer({ first_name: firstName, last_name: lastName, phone: phone ?? "" });
    return { saved: true };
  },
  { auth: "customer" },
);

// --- The address book -----------------------------------------------------------------------------

export const ADDRESS_FIELDS = [
  "countryCode",
  "firstName",
  "lastName",
  "company",
  "address1",
  "address2",
  "city",
  "province",
  "postalCode",
  "phone",
] as const;

export const addressSchema = z.object({
  market: marketKey,
  addressId: id.optional(),
  countryCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}$/),
  firstName: text(100),
  lastName: text(100),
  company: text(100),
  address1: text(200),
  address2: text(200),
  city: text(100),
  province: text(100),
  postalCode: text(20),
  phone: text(40),
  isDefaultShipping: z.literal("true").optional(),
});

/** The optional fields a change clears, sent empty: Medusa keeps what a change leaves out. */
const CLEARABLE = ["company", "address_2", "city", "province", "postal_code", "phone"] as const;

/**
 * A new address, or a change to one of the customer's (`addressId`), checked against its country's
 * format and the market's region (the checkout's rule, so a saved address is one the checkout
 * takes); `isDefaultShipping` makes it the default for shipping.
 */
export const saveAddressAction = action(
  addressSchema,
  async ({ market, addressId, isDefaultShipping, ...address }, { customer }) => {
    const context = await contextFor(market);
    if (addressId !== undefined) ownAddress(customer, addressId);
    const locale = context.market.htmlLang;
    const errors = addressErrors(address, context.region.countries, locale);
    if (Object.keys(errors).length > 0) throw new FieldsError(errors);
    const kept = keepFormatFields(address, locale);
    const input = toAddressInput({
      ...kept,
      firstName: kept.firstName ?? "",
      lastName: kept.lastName ?? "",
      address1: kept.address1 ?? "",
    });
    // An unticked box is not posted: a change without it makes the address no longer the default.
    const isDefault = isDefaultShipping !== undefined;
    if (addressId === undefined)
      await addAddress({ ...input, ...(isDefault ? { is_default_shipping: true } : {}) });
    else {
      const cleared = Object.fromEntries(
        CLEARABLE.filter((field) => input[field] === undefined).map((field) => [field, ""]),
      );
      await updateAddress(addressId, { ...cleared, ...input, is_default_shipping: isDefault });
    }
    return { saved: true };
  },
  { auth: "customer" },
);

export const addressIdSchema = z.object({ market: marketKey, addressId: id });

export const removeAddressAction = action(
  addressIdSchema,
  async ({ market, addressId }, { customer }) => {
    await contextFor(market);
    ownAddress(customer, addressId);
    await deleteAddress(addressId);
    return { removed: true };
  },
  { auth: "customer" },
);

export const defaultAddressAction = action(
  addressIdSchema,
  async ({ market, addressId }, { customer }) => {
    await contextFor(market);
    ownAddress(customer, addressId);
    await updateAddress(addressId, { is_default_shipping: true });
    return { saved: true };
  },
  { auth: "customer" },
);

// --- Returns -------------------------------------------------------------------------------------

export const returnSchema = z.looseObject({
  market: marketKey,
  orderId: id,
  reason: id,
  note: text(500),
});

/** The form's quantities: `items.<line id>` each, a whole number; none above zero is none. */
function chosenItems(input: Record<string, unknown>): { id: string; quantity: number }[] {
  const items: { id: string; quantity: number }[] = [];
  for (const [name, value] of Object.entries(input)) {
    if (!name.startsWith("items.") || typeof value !== "string") continue;
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)
      throw new FieldsError({ items: "invalid" });
    if (quantity > 0) items.push({ id: name.slice("items.".length), quantity });
  }
  return items;
}

/**
 * A return of the customer's own order: each line no more than may still go back, a reason the
 * store has. The backend checks the owner again and ships it back with the zone's free option.
 */
export const requestReturnAction = action(
  returnSchema,
  async (input) => {
    const { market, orderId, reason, note } = input;
    const context = await contextFor(market);
    const items = chosenItems(input);
    const [order, reasons] = await Promise.all([
      getOrder(orderId, context.market.medusaLocale),
      listReturnReasons(),
    ]);
    if (order === null) throw new ActionError("not-found", "not the customer's order");
    const errors: Record<string, "required"> = {};
    if (items.length === 0) errors.items = "required";
    if (!reasons.some((each) => each.id === reason)) errors.reason = "required";
    if (Object.keys(errors).length > 0) throw new FieldsError(errors);
    for (const item of items) {
      const line = order.lines.find((each) => each.id === item.id);
      if (line === undefined || item.quantity > returnableOf(line))
        throw new FieldsError({ items: "required" });
    }
    await createCustomerReturn({
      orderId: order.id,
      items,
      reasonId: reason,
      ...(note === undefined ? {} : { note }),
    });
    return { sent: true };
  },
  { auth: "customer" },
);

// --- The guest-order claim -------------------------------------------------------------------------

export const claimSchema = z.object({
  market: marketKey,
  number: z
    .string()
    .trim()
    .regex(/^#?\d{1,9}$/)
    .transform((value) => Number(value.replace("#", "")))
    .pipe(z.int().positive()),
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
});

/**
 * Claims an order placed as a guest by its number and its e-mail (D64): the order's address gets
 * a link to accept. The answer is "sent" whether or not the number and the e-mail match an order,
 * so the form tells nobody which orders exist; an order that is the customer's already is said.
 */
export const claimOrderAction = action(
  claimSchema,
  async ({ market, number, email }) => {
    const context = await contextFor(market);
    try {
      await claimOrder(number, email, mailTarget(context.market, context.map));
    } catch (error) {
      // Any other refusal (no such order, another account's, a transfer already open) is "sent"
      // too: an answer of its own would tell that the number and the e-mail match an order.
      // Only a session that ended and an outage are said.
      if (
        error instanceof MedusaRequestError &&
        error.kind === "rejected" &&
        error.status !== 401
      ) {
        if (error.status === 422)
          throw new ActionError("rejected", "the order is the customer's", "mine");
        return { sent: true };
      }
      throw error;
    }
    return { sent: true };
  },
  { auth: "customer" },
);

export const transferSchema = z.object({
  market: marketKey,
  orderId: id,
  token: z.string().min(1).max(2048),
  decision: z.enum(["accept", "decline"]),
});

/** The transfer link's answer: the order moves to the customer who claimed it, or stays. */
export const transferAction = action(
  transferSchema,
  async ({ market, orderId, token, decision }) => {
    await contextFor(market);
    const done =
      decision === "accept"
        ? await acceptOrderTransfer(orderId, token)
        : await declineOrderTransfer(orderId, token);
    return {
      outcome: done ? (decision === "accept" ? "accepted" : "declined") : "failed",
    } as const;
  },
);
