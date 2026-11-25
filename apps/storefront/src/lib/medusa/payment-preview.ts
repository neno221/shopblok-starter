// M6 D117 (T100): a ConfirmationToken's preview as the backend keeps it on the cart (and Medusa
// copies to the order): the method's type and, for a card, its brand, last four digits and wallet.
// Read from `metadata`, so nothing about its shape is trusted.

export type PaymentPreview = { type: string; brand?: string; last4?: string; wallet?: string };

/** `metadata.payment_preview` as a preview, or `null` when it is not one. */
export function toPaymentPreview(value: unknown): PaymentPreview | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.type !== "string" || raw.type === "") return null;
  const preview: PaymentPreview = { type: raw.type };
  if (typeof raw.brand === "string") preview.brand = raw.brand;
  if (typeof raw.last4 === "string" && /^\d{4}$/.test(raw.last4)) preview.last4 = raw.last4;
  if (typeof raw.wallet === "string") preview.wallet = raw.wallet;
  return preview;
}
