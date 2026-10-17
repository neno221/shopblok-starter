import type {
  Address,
  LocationAddress,
  OrderEvent,
  PaymentBrand,
  PaymentMethod,
  SavedPaymentMethod,
  Stock,
} from "@shopblok/registry/contracts";
import type { ColourKey, Prices, ProductHandle } from "./catalog";

// What the four locales share about buying: the people and places of the address book, the cart,
// the orders, the payment methods and the shipping options. The words (a shipping option's name,
// a product's title) are the locale's.

/** The DS markets' countries, lower case. */
export type AddressCountry = "cy" | "us" | "de" | "ch";

/** The countries that quote prices with VAT included, and the rate (CY 19 %, DE 19 %, CH 8.1 %). */
export const vatRates: Partial<Record<string, number>> = { cy: 0.19, de: 0.19, ch: 0.081 };

/**
 * The same four addresses in every locale, each in its country's format. Names, streets and numbers
 * are made up; the US phone number is in the 555-01xx range that is reserved for fiction.
 */
export const addressBook: Record<AddressCountry, Address> = {
  cy: {
    id: "addr_cy",
    firstName: "Ελένη",
    lastName: "Χαραλάμπους",
    address1: "Λεωφόρος Μακαρίου Γ΄ 45",
    city: "Λευκωσία",
    postalCode: "1065",
    countryCode: "cy",
    phone: "+357 22 000 142",
  },
  us: {
    id: "addr_us",
    firstName: "Jordan",
    lastName: "Ellis",
    company: "Northside Design Co.",
    address1: "482 Maple Avenue",
    address2: "Suite 210",
    city: "Brooklyn",
    province: "NY",
    postalCode: "11215",
    countryCode: "us",
    phone: "+1 718 555 0148",
  },
  de: {
    id: "addr_de",
    firstName: "Lena",
    lastName: "Hartmann",
    address1: "Lindenstraße 27",
    city: "Berlin",
    postalCode: "10969",
    countryCode: "de",
    phone: "+49 30 23125 042",
  },
  ch: {
    id: "addr_ch",
    firstName: "Noah",
    lastName: "Meier",
    address1: "Bahnhofstrasse 42",
    city: "Zürich",
    postalCode: "8001",
    countryCode: "ch",
    phone: "+41 44 555 01 42",
  },
};

/** The order the book is listed in; the locale's own country is moved to the front. */
export const addressOrder: AddressCountry[] = ["cy", "us", "de", "ch"];

/** The store where an order can be collected, one per country. */
export const storeAddresses: Record<AddressCountry, LocationAddress> = {
  cy: {
    address1: "Λεωφόρος Σπύρου Κυπριανού 12",
    city: "Λευκωσία",
    postalCode: "1075",
    countryCode: "cy",
  },
  us: {
    address1: "118 Wythe Avenue",
    city: "Brooklyn",
    province: "NY",
    postalCode: "11249",
    countryCode: "us",
  },
  de: {
    address1: "Torstraße 61",
    city: "Berlin",
    postalCode: "10119",
    countryCode: "de",
  },
  ch: {
    address1: "Rämistrasse 18",
    city: "Zürich",
    postalCode: "8001",
    countryCode: "ch",
  },
};

/** One line of the cart or of an order: a product, the colour and size chosen, and how many. */
export type LineSpec = {
  id: string;
  handle: ProductHandle;
  variantId: string;
  colour: ColourKey;
  /** A size is the same word in every locale (M, 39–42). */
  size: string;
  quantity: number;
};

export const cartSpec = {
  id: "cart_01",
  /** 10 % off the subtotal. */
  promo: { code: "WELCOME10", rate: 0.1 },
  /** The cart is under it in every currency: the progress bar has something left to fill. */
  freeShippingThreshold: { EUR: 150, USD: 165, CHF: 150 } satisfies Prices,
  lines: [
    // Quantity 2.
    {
      id: "line_01",
      handle: "merino-ankle-socks",
      variantId: "var_merino_ankle_socks_charcoal_39_42",
      colour: "charcoal",
      size: "39–42",
      quantity: 2,
    },
    // On sale: the unit price shows the one it replaces.
    {
      id: "line_02",
      handle: "brushed-fleece-hoodie",
      variantId: "var_brushed_fleece_hoodie_forest_l",
      colour: "forest",
      size: "L",
      quantity: 1,
    },
    // Three left: no more than three can be added.
    {
      id: "line_03",
      handle: "essential-tee",
      variantId: "var_essential_tee_oatmeal_m",
      colour: "oatmeal",
      size: "M",
      quantity: 1,
    },
  ] satisfies LineSpec[],
  lowStock: { lineId: "line_03", stock: { status: "low", quantity: 3 } satisfies Stock },
};

export type OrderSpec = {
  id: string;
  displayId: number;
  status: "pending" | "completed";
  lines: LineSpec[];
  /** The share of the subtotal taken off. */
  discountRate: number;
  shipping: "standard" | "express";
  payment: { brand: PaymentBrand; last4: string };
  /** Oldest first, the first `placed`. */
  events: OrderEvent[];
};

const carrier = "Parcelline";
const trackingNumber = "PL26081500412";

export const orderSpecs: OrderSpec[] = [
  {
    // Delivered, with its whole history.
    id: "order_1042",
    displayId: 1042,
    status: "completed",
    lines: [
      {
        id: "oline_1042_1",
        handle: "heritage-hoodie",
        variantId: "var_heritage_hoodie_black_l",
        colour: "black",
        size: "L",
        quantity: 1,
      },
      {
        id: "oline_1042_2",
        handle: "essential-tee",
        variantId: "var_essential_tee_white_m",
        colour: "white",
        size: "M",
        quantity: 2,
      },
    ],
    discountRate: 0,
    shipping: "standard",
    payment: { brand: "visa", last4: "4242" },
    events: [
      { kind: "placed", at: "2026-08-14T10:22:31.000Z" },
      { kind: "paid", at: "2026-08-14T10:23:05.000Z" },
      { kind: "fulfilled", at: "2026-08-15T13:40:00.000Z" },
      {
        kind: "shipped",
        at: "2026-08-15T16:05:12.000Z",
        carrier,
        trackingNumber,
        trackingUrl: `https://track.example.com/parcelline/${trackingNumber}`,
      },
      { kind: "delivered", at: "2026-08-18T11:47:09.000Z" },
    ],
  },
  {
    // Placed and paid two days before "now", not yet picked.
    id: "order_1057",
    displayId: 1057,
    status: "pending",
    lines: [
      {
        id: "oline_1057_1",
        handle: "waxed-field-jacket",
        variantId: "var_waxed_field_jacket_olive_m",
        colour: "olive",
        size: "M",
        quantity: 1,
      },
      {
        id: "oline_1057_2",
        handle: "merino-ankle-socks",
        variantId: "var_merino_ankle_socks_charcoal_39_42",
        colour: "charcoal",
        size: "39–42",
        quantity: 1,
      },
    ],
    discountRate: 0.1,
    shipping: "express",
    payment: { brand: "mastercard", last4: "4444" },
    events: [
      { kind: "placed", at: "2026-09-29T18:12:44.000Z" },
      { kind: "paid", at: "2026-09-29T18:13:10.000Z" },
    ],
  },
];

/** The customer of both orders. */
export const customerEmail = "anna.keller@example.com";

export type ShippingSpec = {
  id: string;
  key: "standard" | "express" | "free" | "pickup" | "sameDay";
  prices: Prices;
  estimate: { minDays: number; maxDays: number };
  available: boolean;
};

// Standard, express, free (slow) and pickup can be chosen; same-day is not offered at this address.
export const shippingSpecs: ShippingSpec[] = [
  {
    id: "so_standard",
    key: "standard",
    prices: { EUR: 4.9, USD: 5.5, CHF: 6.9 },
    estimate: { minDays: 3, maxDays: 5 },
    available: true,
  },
  {
    id: "so_express",
    key: "express",
    prices: { EUR: 12.9, USD: 14, CHF: 14.9 },
    estimate: { minDays: 1, maxDays: 2 },
    available: true,
  },
  {
    id: "so_free",
    key: "free",
    prices: { EUR: 0, USD: 0, CHF: 0 },
    estimate: { minDays: 5, maxDays: 8 },
    available: true,
  },
  {
    id: "so_pickup",
    key: "pickup",
    prices: { EUR: 0, USD: 0, CHF: 0 },
    estimate: { minDays: 1, maxDays: 2 },
    available: true,
  },
  {
    id: "so_same_day",
    key: "sameDay",
    prices: { EUR: 19.9, USD: 22, CHF: 24.9 },
    estimate: { minDays: 0, maxDays: 0 },
    available: false,
  },
];

/** A payment method before its name: only the card's is the locale's, the others are brands. */
export type PaymentMethodSpec = Omit<PaymentMethod, "name"> & { name?: string };

/** Provider ids as Medusa's Stripe plugin names them (`pp_{id}_{provider}`). */
export const paymentMethodSpecs: PaymentMethodSpec[] = [
  { id: "pp_stripe_stripe", kind: "card", brands: ["visa", "mastercard", "americanexpress"] },
  { id: "pp_stripe-applepay_stripe", kind: "wallet", name: "Apple Pay", brands: ["applepay"] },
  { id: "pp_stripe-googlepay_stripe", kind: "wallet", name: "Google Pay", brands: ["googlepay"] },
  { id: "pp_stripe-revolut_stripe", kind: "wallet", name: "Revolut Pay", brands: ["revolut"] },
  { id: "pp_stripe-paypal_stripe", kind: "redirect", name: "PayPal", brands: ["paypal"] },
  { id: "pp_stripe-klarna_stripe", kind: "redirect", name: "Klarna", brands: ["klarna"] },
];

/** Cards of the customer, all expiring after the fixtures' "now" (October 2026). */
export const savedCards: Omit<SavedPaymentMethod, "holderName">[] = [
  { id: "spm_01", brand: "visa", last4: "4242", expiryMonth: 8, expiryYear: 2028, isDefault: true },
  {
    id: "spm_02",
    brand: "mastercard",
    last4: "4444",
    expiryMonth: 12,
    expiryYear: 2027,
    isDefault: false,
  },
  {
    id: "spm_03",
    brand: "americanexpress",
    last4: "0005",
    expiryMonth: 3,
    expiryYear: 2029,
    isDefault: false,
  },
];
