import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import type { EmailOrder, EmailOrderLine } from "@shopblok/emails";

import { languageFrom, type EmailType } from "./email-copy";
import { sendEmail, storefrontUrl } from "./storefront-mail";
import { marketPrefixFrom } from "./storefront-url";

/**
 * The order e-mails' data (D122, SPEC §8.4): who the e-mail goes to, in which language, to which
 * page of which market, and the order's summary written for the reader. The storefront stores
 * `{ market, language }` (the market's public prefix and its language) in the cart's `metadata`
 * when the order is placed, and Medusa copies it to the order; an order without it (placed before
 * T99, or in Medusa Admin) reads the language of its locale (`el-GR` is `el`) and the primary
 * market. The amounts are in the order's currency and the date in the market's time zone (the
 * markets plugin's, by the shipping country; UTC when it has none), both written in the order's
 * locale, as the receipt writes them.
 */

/** The fields of an order the e-mails read (`query.graph`). */
export const ORDER_EMAIL_FIELDS = [
  "id",
  "display_id",
  "email",
  "locale",
  "currency_code",
  "created_at",
  "metadata",
  "customer.has_account",
  "item_subtotal",
  "discount_total",
  "shipping_total",
  "tax_total",
  "total",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.postal_code",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.country_code",
];

type Amount = number | string | { valueOf(): number } | null | undefined;

export type OrderRow = {
  id: string;
  display_id?: number | null;
  email?: string | null;
  locale?: string | null;
  currency_code: string;
  created_at?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  customer?: { has_account?: boolean | null } | null;
  item_subtotal?: Amount;
  discount_total?: Amount;
  shipping_total?: Amount;
  tax_total?: Amount;
  total?: Amount;
  items?:
    | ({
        id: string;
        title?: string | null;
        product_title?: string | null;
        variant_title?: string | null;
        quantity?: Amount;
        total?: Amount;
      } | null)[]
    | null;
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    province?: string | null;
    country_code?: string | null;
  } | null;
};

/** An order's id → the order as the e-mails read it, or `null` when Medusa has none. */
export async function readOrder(
  container: MedusaContainer,
  orderId: string,
): Promise<OrderRow | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "order",
    fields: ORDER_EMAIL_FIELDS,
    filters: { id: orderId },
  })) as { data: OrderRow[] };
  return data[0] ?? null;
}

/** Medusa's BigNumber (or a number, or its string) as a number. */
export const amountOf = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const number = Number(typeof value === "object" ? value.valueOf() : value);
  return Number.isFinite(number) ? number : 0;
};

/** The order's language: the storefront's `metadata.language`, else its locale's, else English. */
export function orderLanguage(order: Pick<OrderRow, "metadata" | "locale">): string {
  if (typeof order.metadata?.["language"] === "string") return languageFrom(order.metadata);
  const fromLocale = order.locale?.split("-")[0]?.toLowerCase();
  return languageFrom({ language: fromLocale });
}

/** The `Intl` locale the amounts and the date are written in: the order's, or its language. */
function intlLocale(order: Pick<OrderRow, "locale">, language: string): string {
  const locale = order.locale ?? language;
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? language;
  } catch {
    return language;
  }
}

/** `amount` in the order's currency, written in `locale`. */
export function formatAmount(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * The time zone of the market the order ships to (the markets plugin's country row, D65), or UTC
 * when the country has none or the plugin cannot be read.
 */
export async function timeZoneOf(
  container: MedusaContainer,
  countryCode: string | null | undefined,
): Promise<string> {
  if (!countryCode) return "UTC";
  try {
    const markets = container.resolve("markets") as {
      listMarketCountries(
        filters: { code: string },
        config: { take: number },
      ): Promise<{ time_zone?: string | null }[]>;
    };
    const [row] = await markets.listMarketCountries(
      { code: countryCode.toLowerCase() },
      { take: 1 },
    );
    const zone = row?.time_zone ?? undefined;
    if (zone === undefined) return "UTC";
    // A zone `Intl` does not know throws here, and the date reads UTC instead.
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
    return zone;
  } catch {
    return "UTC";
  }
}

/** The line as the e-mail shows it: the product's title and, unless it is the default, the variant's. */
function lineOf(
  item: NonNullable<NonNullable<OrderRow["items"]>[number]>,
  money: (amount: Amount) => string,
): EmailOrderLine {
  const title = item.product_title || item.title || "";
  const variant = item.variant_title?.trim();
  const detail =
    variant && variant !== title && variant.toLowerCase() !== "default variant"
      ? variant
      : undefined;
  return {
    title,
    ...(detail === undefined ? {} : { detail }),
    quantity: Math.max(1, Math.round(amountOf(item.quantity))),
    total: money(item.total),
  };
}

export type OrderSummaryOptions = {
  /** Only these lines, with these quantities (a return's): by the order's line id. */
  only?: ReadonlyMap<string, number>;
  /** Which sums to show: the order's (default), none, or one refunded amount. */
  totals?: "order" | "none" | { refunded: number };
  tracking?: EmailOrder["tracking"];
  shipTo?: boolean;
};

/** The order's summary for its e-mails (D122), written in the order's locale and time zone. */
export async function orderSummary(
  container: MedusaContainer,
  order: OrderRow,
  options: OrderSummaryOptions = {},
): Promise<EmailOrder> {
  const language = orderLanguage(order);
  const locale = intlLocale(order, language);
  const money = (amount: Amount) => formatAmount(amountOf(amount), order.currency_code, locale);
  const timeZone = await timeZoneOf(container, order.shipping_address?.country_code);
  const placed = new Date(order.created_at ?? Date.now());

  const items = (order.items ?? []).flatMap((item) => (item === null ? [] : [item]));
  const lines = items.flatMap((item) => {
    if (options.only === undefined) return [lineOf(item, money)];
    const quantity = options.only.get(item.id);
    if (quantity === undefined) return [];
    const unit = amountOf(item.total) / Math.max(1, amountOf(item.quantity));
    return [lineOf({ ...item, quantity, total: unit * quantity }, money)];
  });

  const sums = options.totals ?? "order";
  const totals: EmailOrder["totals"] =
    sums === "none"
      ? []
      : sums === "order"
        ? [
            { kind: "subtotal" as const, amount: money(order.item_subtotal) },
            ...(amountOf(order.discount_total) > 0
              ? [{ kind: "discount" as const, amount: `−${money(order.discount_total)}` }]
              : []),
            { kind: "shipping" as const, amount: money(order.shipping_total) },
            ...(amountOf(order.tax_total) > 0
              ? [{ kind: "tax" as const, amount: money(order.tax_total) }]
              : []),
            { kind: "total" as const, amount: money(order.total) },
          ]
        : [{ kind: "refunded" as const, amount: money(sums.refunded) }];

  const address = order.shipping_address;
  const shipTo =
    options.shipTo !== false && address
      ? [
          [address.first_name, address.last_name].filter(Boolean).join(" "),
          address.company ?? "",
          address.address_1 ?? "",
          address.address_2 ?? "",
          [address.postal_code, address.city].filter(Boolean).join(" "),
          address.province ?? "",
          (address.country_code ?? "").toUpperCase(),
        ].filter((line) => line.trim() !== "")
      : [];

  return {
    number: String(order.display_id ?? order.id),
    date: new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeStyle: "short",
      timeZone,
    }).format(placed),
    lines,
    totals,
    ...(shipTo.length > 0 ? { shipTo } : {}),
    ...(options.tracking?.length ? { tracking: options.tracking } : {}),
  };
}

/**
 * The page an order e-mail's button opens (D122): the order in the account for a customer with an
 * account, else the order lookup, where a shopper who signs in can add a guest order to an account
 * (the receipt opens only in the browser that placed the order). The market is the one the order
 * was placed in.
 */
export function orderPage(order: Pick<OrderRow, "id" | "customer">): `/${string}` {
  return order.customer?.has_account
    ? `/account/orders/${encodeURIComponent(order.id)}`
    : "/order/lookup";
}

/** The order's `metadata` as the links read it (`{ market }`), shape-checked there. */
export const orderMetadata = (order: Pick<OrderRow, "metadata">): { market: string } => ({
  market: marketPrefixFrom(order.metadata),
});

/**
 * Sends one of the order's e-mails (D122) to the order's address, in its language, with the link
 * to its page in its market, the summary, the order's number and `values` as variables.
 */
export async function sendOrderEmail(
  container: MedusaContainer,
  {
    order,
    type,
    template,
    summary,
    values = {},
    idempotencyKey,
  }: {
    order: OrderRow;
    type: EmailType;
    template: string;
    summary: EmailOrder;
    values?: Record<string, string>;
    idempotencyKey: string;
  },
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  if (!order.email) {
    logger.warn(`${template}: order ${order.id} has no e-mail address, so nothing was sent.`);
    return;
  }
  const url = storefrontUrl(container, orderMetadata(order), orderPage(order), {}, template);
  if (url === undefined) return;
  await sendEmail(container, {
    to: order.email,
    template,
    type,
    values: { orderNumber: summary.number, ...values },
    language: orderLanguage(order),
    url,
    order: summary,
    data: { order_id: order.id },
    idempotencyKey,
  });
}
