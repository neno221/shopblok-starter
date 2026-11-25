import "server-only";
import { getAuthHeaders } from "./cookies";
import { medusaRequest, MedusaRequestError } from "./sdk";

// M6 D119 (T101): the signed-in customer's saved payment methods, through the backend's
// `/store/customers/me/payment-methods` (each route reaches only the caller's own methods). Never
// cached: a wallet is one customer's. Only what the backend answers is read, and checked again
// (`toSavedMethodDto`): the id, the type, a card's brand, last four, expiry and wallet.

/** A saved method as the storefront draws it. */
export type SavedMethodDto = {
  id: string;
  type: "card" | "revolut_pay";
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  wallet: string | null;
};

/** One entry of the backend's answer, or `null` when it is not one the shop draws. */
export function toSavedMethodDto(value: unknown): SavedMethodDto | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !/^pm_[A-Za-z0-9]{1,200}$/.test(raw.id)) return null;
  if (raw.type !== "card" && raw.type !== "revolut_pay") return null;
  const text = (v: unknown, pattern: RegExp) =>
    typeof v === "string" && pattern.test(v) ? v : null;
  const whole = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
  return {
    id: raw.id,
    type: raw.type,
    brand: text(raw.brand, /^[a-z_]{1,30}$/),
    last4: text(raw.last4, /^\d{4}$/),
    expiryMonth: whole(raw.exp_month, 1, 12),
    expiryYear: whole(raw.exp_year, 2000, 2100),
    wallet: text(raw.wallet, /^[a-z_]{1,30}$/),
  };
}

/** The headers of the signed-in customer; an error when nobody is (the caller checks first). */
async function customerHeaders(): Promise<{ authorization: string }> {
  const headers = await getAuthHeaders();
  if (headers === undefined) throw new MedusaRequestError("Nobody is signed in", "rejected", 401);
  return headers;
}

/** The signed-in customer's saved methods; none for a visitor nobody signed in as. */
export async function listSavedMethods(): Promise<SavedMethodDto[]> {
  const headers = await getAuthHeaders();
  if (headers === undefined) return [];
  try {
    const { payment_methods: methods } = await medusaRequest((sdk) =>
      sdk.client.fetch<{ payment_methods: unknown[] }>("/store/customers/me/payment-methods", {
        headers,
      }),
    );
    return (methods ?? []).flatMap((method) => {
      const dto = toSavedMethodDto(method);
      return dto === null ? [] : [dto];
    });
  } catch (error) {
    if (error instanceof MedusaRequestError && error.kind === "rejected" && error.status === 401)
      return [];
    throw error;
  }
}

/**
 * A SetupIntent for the account's "Add a payment method": its client secret, which the Payment
 * Element in setup mode confirms in the browser.
 */
export async function startSetup(): Promise<{ clientSecret: string }> {
  const headers = await customerHeaders();
  const { setup_intent: intent } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ setup_intent: { client_secret: string } }>(
      "/store/customers/me/payment-methods",
      { method: "POST", headers },
    ),
  );
  return { clientSecret: intent.client_secret };
}

/** Removes one of the signed-in customer's saved methods (another's is Medusa's 404). */
export async function removeSavedMethod(id: string): Promise<void> {
  const headers = await customerHeaders();
  await medusaRequest((sdk) =>
    sdk.client.fetch(`/store/customers/me/payment-methods/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    }),
  );
}
