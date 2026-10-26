import "server-only";
import {
  getAuthHeaders,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
  type PendingCustomer,
} from "./cookies";
import type { AddressInput } from "./cart";
import { medusaRequest, MedusaRequestError } from "./sdk";

// The customer and the auth flow (D64), ported from dtc-starter's `lib/data/customer.ts`. T53 wires
// the pages and the actions; this file is what they call. The flow: register, then log in, which
// answers `verification_required` while the e-mail is unverified; the verification request carries
// the market's public prefix as `metadata.market` (T44 builds the link from it); `/verify` confirms
// with the code alone; the next login creates the customer from the pending cookie, sets the JWT
// cookie and moves the guest cart to the customer. SPEC §8.2's fix: `getAuthHeaders()` is
// `undefined` without a token, so a signed-out read returns `null` instead of calling Medusa.

export type CustomerAddressDto = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export type CustomerDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addresses: CustomerAddressDto[];
};

type WireAddress = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  phone?: string | null;
  is_default_shipping?: boolean | null;
  is_default_billing?: boolean | null;
};

export type WireCustomer = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  addresses?: (WireAddress | null)[] | null;
};

const text = (value: string | null | undefined) => (value ? value : null);

export function toAddressDto(address: WireAddress): CustomerAddressDto {
  return {
    id: address.id,
    firstName: address.first_name ?? "",
    lastName: address.last_name ?? "",
    company: text(address.company),
    address1: address.address_1 ?? "",
    address2: text(address.address_2),
    city: text(address.city),
    province: text(address.province),
    postalCode: text(address.postal_code),
    countryCode: (address.country_code ?? "").toLowerCase(),
    phone: text(address.phone),
    isDefaultShipping: address.is_default_shipping === true,
    isDefaultBilling: address.is_default_billing === true,
  };
}

export function toCustomerDto(customer: WireCustomer): CustomerDto {
  return {
    id: customer.id,
    email: customer.email,
    firstName: text(customer.first_name),
    lastName: text(customer.last_name),
    phone: text(customer.phone),
    addresses: (customer.addresses ?? []).flatMap((address) =>
      address === null ? [] : [toAddressDto(address)],
    ),
  };
}

const CUSTOMER_FIELDS = "id,email,first_name,last_name,phone,*addresses";

/**
 * The signed-in customer, or `null`: no token, or a token Medusa no longer takes (expired, or one
 * with no customer yet). Never cached across requests.
 */
export async function getCustomer(): Promise<CustomerDto | null> {
  const headers = await getAuthHeaders();
  if (headers === undefined) return null;
  try {
    const { customer } = await medusaRequest((sdk) =>
      sdk.store.customer.retrieve({ fields: CUSTOMER_FIELDS }, headers),
    );
    return toCustomerDto(customer as unknown as WireCustomer);
  } catch (error) {
    if (error instanceof MedusaRequestError && error.kind === "rejected" && error.status === 401)
      return null;
    throw error;
  }
}

/** The headers of a write for the signed-in customer; an error when nobody is (the action re-checks). */
async function requireAuthHeaders(): Promise<{ authorization: string }> {
  const headers = await getAuthHeaders();
  if (headers === undefined) throw new MedusaRequestError("Nobody is signed in", "rejected", 401);
  return headers;
}

export async function updateCustomer(fields: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<CustomerDto> {
  const headers = await requireAuthHeaders();
  const { customer } = await medusaRequest((sdk) =>
    sdk.store.customer.update(fields, { fields: CUSTOMER_FIELDS }, headers),
  );
  return toCustomerDto(customer as unknown as WireCustomer);
}

export async function addAddress(
  address: AddressInput & { is_default_shipping?: boolean; is_default_billing?: boolean },
): Promise<CustomerDto> {
  const headers = await requireAuthHeaders();
  const { customer } = await medusaRequest((sdk) =>
    sdk.store.customer.createAddress(address, { fields: CUSTOMER_FIELDS }, headers),
  );
  return toCustomerDto(customer as unknown as WireCustomer);
}

/**
 * Medusa scopes `/store/customers/me/addresses/{id}` to the token's customer, so another
 * customer's address id is a 404 there; the action checks the id against `getCustomer()` first
 * as well (SPEC §11.1), so the refusal does not depend on Medusa alone.
 */
export async function updateAddress(
  addressId: string,
  address: Partial<AddressInput> & { is_default_shipping?: boolean; is_default_billing?: boolean },
): Promise<CustomerDto> {
  const headers = await requireAuthHeaders();
  const { customer } = await medusaRequest((sdk) =>
    sdk.store.customer.updateAddress(addressId, address, { fields: CUSTOMER_FIELDS }, headers),
  );
  return toCustomerDto(customer as unknown as WireCustomer);
}

export async function deleteAddress(addressId: string): Promise<void> {
  const headers = await requireAuthHeaders();
  await medusaRequest((sdk) => sdk.store.customer.deleteAddress(addressId, headers));
}

// --- Auth (T53 wires these) -----------------------------------------------------------------------

export type LoginResult =
  | { state: "signed-in" }
  | { state: "verification-required"; email: string }
  | { state: "error"; reason: "credentials" | "unsupported" | "not-verified" | "unavailable" };

/**
 * Logs in and finishes what a registration left (dtc-starter's `completeLogin`). `prefix` is the
 * market's public prefix (`""`, `/us`, `/ch/fr`), which T44's subscriber puts before `/verify` in
 * the e-mail's link. A token with no customer yet creates the customer from the pending cookie and
 * logs in again for a token bound to it; the JWT cookie is set only for that one. The guest cart
 * moves to the customer.
 */
export async function login(email: string, password: string, prefix: string): Promise<LoginResult> {
  let result: unknown;
  try {
    result = await medusaRequest((sdk) =>
      sdk.auth.login("customer", "emailpass", { email, password }),
    );
  } catch (error) {
    if (error instanceof MedusaRequestError && error.kind === "rejected" && error.status === 401)
      return { state: "error", reason: "credentials" };
    throw error;
  }
  if (typeof result === "object" && result !== null && "verification_required" in result) {
    const { token } = result as unknown as { token: string };
    await requestVerification(email, token, prefix).catch(() => undefined);
    return { state: "verification-required", email };
  }
  if (typeof result !== "string") return { state: "error", reason: "unsupported" };

  let token = result;
  const bearer = { authorization: `Bearer ${token}` };
  const hasCustomer = await medusaRequest((sdk) =>
    sdk.store.customer.retrieve({ fields: "id" }, bearer),
  )
    .then(() => true)
    .catch(() => false);
  if (!hasCustomer) {
    const pending = await getPendingCustomer();
    try {
      await medusaRequest((sdk) =>
        sdk.store.customer.create(
          {
            email,
            ...(pending?.firstName ? { first_name: pending.firstName } : {}),
            ...(pending?.lastName ? { last_name: pending.lastName } : {}),
            ...(pending?.phone ? { phone: pending.phone } : {}),
          },
          {},
          bearer,
        ),
      );
    } catch (error) {
      // T44: the backend answers 403 until the e-mail is verified (Medusa 2.21.2 does not refuse it).
      if (error instanceof MedusaRequestError && error.status === 403)
        return { state: "error", reason: "not-verified" };
      throw error;
    }
    const second = await medusaRequest((sdk) =>
      sdk.auth.login("customer", "emailpass", { email, password }),
    );
    if (typeof second !== "string") return { state: "error", reason: "unsupported" };
    token = second;
    await removePendingCustomer();
  }
  await setAuthToken(token);
  await transferCart();
  return { state: "signed-in" };
}

/**
 * Registers an identity and keeps the form's other fields for the login that creates the customer.
 * An identity that exists already (an admin with the same e-mail) is not an error: the login after
 * it links a customer to it, as in dtc-starter.
 */
export async function register(
  customer: PendingCustomer,
  password: string,
  prefix: string,
): Promise<LoginResult> {
  try {
    await medusaRequest((sdk) =>
      sdk.auth.register("customer", "emailpass", { email: customer.email, password }),
    );
  } catch (error) {
    const exists =
      error instanceof MedusaRequestError &&
      error.status === 401 &&
      /already exists/i.test(error.message);
    if (!exists) throw error;
  }
  await setPendingCustomer(customer);
  return login(customer.email, password, prefix);
}

/** Asks Medusa to send the verification e-mail, with the market's prefix for the link (T44). */
export async function requestVerification(
  email: string,
  token: string,
  prefix: string,
): Promise<void> {
  await medusaRequest((sdk) =>
    sdk.auth.verification.request(
      { entity_id: email, entity_type: "email", metadata: { market: prefix } },
      { authorization: `Bearer ${token}` },
    ),
  );
}

/** Confirms the e-mail with the link's code. Needs no session: the link may open on another device. */
export async function confirmVerification(code: string): Promise<boolean> {
  return medusaRequest((sdk) => sdk.auth.verification.confirm({ code }))
    .then(() => true)
    .catch(() => false);
}

/** Sends the reset link (T44 builds `{prefix}/reset-password?token=…&email=…`). */
export async function requestPasswordReset(email: string, prefix: string): Promise<void> {
  await medusaRequest((sdk) =>
    sdk.auth.resetPassword("customer", "emailpass", {
      identifier: email,
      metadata: { market: prefix },
    }),
  );
}

export async function resetPassword(email: string, password: string, token: string): Promise<void> {
  await medusaRequest((sdk) =>
    sdk.auth.updateProvider("customer", "emailpass", { email, password }, token),
  );
}

/**
 * Signs out: Medusa's session, the JWT cookie and the cart cookie. The cart is the customer's once
 * they signed in, so the next visitor on this browser must not keep it.
 */
export async function logout(): Promise<void> {
  await medusaRequest((sdk) => sdk.auth.logout()).catch(() => undefined);
  await removeAuthToken();
  await removeCartId();
}

/** Moves the guest cart to the signed-in customer, if there is one. */
export async function transferCart(): Promise<void> {
  const cartId = await getCartId();
  const headers = await getAuthHeaders();
  if (cartId === undefined || headers === undefined) return;
  await medusaRequest((sdk) => sdk.store.cart.transferCart(cartId, {}, headers));
}
