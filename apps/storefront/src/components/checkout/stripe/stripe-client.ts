// Ours (M6 T100, SETUP.md "Stripe in the checkout (T100)"; D117). Everything that talks to Stripe in
// the browser: Stripe.js (`@stripe/stripe-js`, which loads `js.stripe.com`), the Payment Element in
// deferred mode, the ConfirmationToken the delivery step posts, and the review's `confirmPayment`.
// The checkout's islands load this module with `import()` when they mount, so no route's first load
// holds it (`first-load.ts`'s `keptOut`, by its marker below).
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { appearanceFrom, smallestUnit, stripeLocale, type TokenColors } from "./stripe-options";

/** `first-load.ts`'s marker for this module: a literal no other source has. */
export const STRIPE_CLIENT_MARKER = "shopblok:stripe-client";

const loaded = new Map<string, Promise<Stripe | null>>();

/** Stripe.js for a key and locale, loaded once per page. */
function stripeFor(publishableKey: string, locale: string): Promise<Stripe | null> {
  const key = `${publishableKey}|${locale}`;
  let stripe = loaded.get(key);
  if (stripe === undefined) {
    stripe = loadStripe(publishableKey, {
      locale: stripeLocale(locale) as never,
    });
    loaded.set(key, stripe);
  }
  return stripe;
}

/** A CSS colour as `rgb()`/`rgba()`, which Stripe's appearance takes (the tokens may be `oklch`). */
function toRgb(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) return color;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return a === 255
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${((a ?? 0) / 255).toFixed(3)})`;
}

/** The shop's tokens, as the element they are drawn in resolves them. */
function readAppearance(host: HTMLElement) {
  const probe = document.createElement("span");
  probe.hidden = true;
  host.append(probe);
  const read = (token: string) => {
    probe.style.color = `var(${token})`;
    return toRgb(getComputedStyle(probe).color);
  };
  const colors: TokenColors = {
    primary: read("--primary"),
    background: read("--background"),
    foreground: read("--foreground"),
    muted: read("--muted-foreground"),
    destructive: read("--destructive"),
    border: read("--border"),
  };
  probe.style.borderRadius = "var(--radius)";
  const radius = Number.parseFloat(getComputedStyle(probe).borderTopLeftRadius) || 8;
  probe.remove();
  return appearanceFrom(colors, radius, "system-ui, -apple-system, 'Segoe UI', sans-serif");
}

export type ElementOptions = {
  publishableKey: string;
  locale: string;
  /** In the main unit, as Medusa's totals are. */
  amount: number;
  currency: string;
  host: HTMLElement;
  onReady?: () => void;
};

export type MountedElement = {
  /** The total changed (another shipping option): the Element's amount follows it. */
  setAmount(amount: number): void;
  /** Checks the details and makes the ConfirmationToken, or says why it cannot. */
  confirmationToken(): Promise<{ token: string } | { error: string | null }>;
  destroy(): void;
};

/** Mounts the Payment Element in deferred mode (no intent yet: D117) in `host`. */
export async function mountPaymentElement(options: ElementOptions): Promise<MountedElement> {
  const stripe = await stripeFor(options.publishableKey, options.locale);
  if (stripe === null) throw new Error("Stripe.js did not load");
  const currency = options.currency.toLowerCase();
  const elements: StripeElements = stripe.elements({
    mode: "payment",
    amount: smallestUnit(options.amount, currency),
    currency,
    // D117: authorised now, captured on shipment (`capture: false` on the backend's provider).
    captureMethod: "manual",
    appearance: readAppearance(options.host),
  });
  const element = elements.create("payment", { layout: { type: "tabs" } });
  if (options.onReady) element.on("ready", options.onReady);
  options.host.setAttribute("data-stripe", STRIPE_CLIENT_MARKER);
  element.mount(options.host);
  return {
    setAmount(amount) {
      elements.update({ amount: smallestUnit(amount, currency) });
    },
    async confirmationToken() {
      const submitted = await elements.submit();
      if (submitted.error) return { error: null }; // The Element shows the field's own message.
      const made = await stripe.createConfirmationToken({ elements });
      if (made.error) return { error: made.error.message ?? null };
      return { token: made.confirmationToken.id };
    },
    destroy() {
      element.destroy();
    },
  };
}

/**
 * The review's confirmation (D117): the PaymentIntent of the cart's session confirmed with the
 * delivery step's ConfirmationToken. A wallet or a 3-D Secure check that needs another page leaves
 * for it and comes back to `returnUrl`; otherwise the caller goes there itself.
 */
export async function confirmIntent(input: {
  publishableKey: string;
  locale: string;
  clientSecret: string;
  confirmationToken: string;
  returnUrl: string;
}): Promise<{ redirected: false; error?: string }> {
  const stripe = await stripeFor(input.publishableKey, input.locale);
  if (stripe === null) throw new Error("Stripe.js did not load");
  const result = await stripe.confirmPayment({
    clientSecret: input.clientSecret,
    confirmParams: { confirmation_token: input.confirmationToken, return_url: input.returnUrl },
    redirect: "if_required",
  });
  if (result.error) return { redirected: false, error: result.error.message ?? "" };
  return { redirected: false };
}

/** A shipping option as the wallet lists it (M6 T102); the amount in the main unit. */
export type ExpressRate = { id: string; name: string; amount: number };

/** What a wallet shows of the address before the shopper pays: no name, no street. */
export type ExpressPartialAddress = {
  countryCode: string;
  postalCode?: string;
  city?: string;
  province?: string;
};

/** What the wallet gives when the shopper pays, with the token made from it. */
export type ExpressPayment = {
  token: string;
  email: string;
  name: string;
  phone?: string;
  address: ExpressPartialAddress & { address1?: string; address2?: string };
  shippingOption: string;
  /** What the wallet showed, in the currency's smallest unit. */
  amount: number;
};

/** The shop's answer to a payment: the session to confirm, or why not. */
export type ExpressPrepared =
  { clientSecret: string; intentId: string } | { error: "address" | "changed" | "failed" };

export type ExpressOptions = {
  publishableKey: string;
  locale: string;
  currency: string;
  /** The cart's total, in the main unit. */
  amount: number;
  host: HTMLElement;
  /** The region's countries, the only ones the wallet may ship to (D120). */
  countries: string[];
  /** The cart's shipping options before the wallet has an address; there is at least one. */
  rates: ExpressRate[];
  /** The wallets the Element draws, by Stripe's names (`link`, `applePay`…); none: `[]`. */
  onShown(methods: string[]): void;
  /** The cart's options and total for the wallet's address, or `null` to refuse it. */
  onAddress(
    address: ExpressPartialAddress,
  ): Promise<{ rates: ExpressRate[]; total: number } | null>;
  /** The cart's total with the wallet's option, or `null` to refuse it. */
  onRate(id: string): Promise<{ total: number } | null>;
  /** The session for the payment, from the shop. */
  onPay(payment: ExpressPayment): Promise<ExpressPrepared>;
  /** The cart's total now, after the shop answered `changed`. */
  onTotal(): Promise<number | null>;
  /** Where Stripe sends a method that leaves the shop, absolute. */
  returnUrl: string;
  /** Confirmed, or refused by Stripe with its reason: the return route says which. */
  onConfirmed(result: { intentId: string; clientSecret: string; error?: string }): void;
  /** The payment stopped before Stripe confirmed it, and why. */
  onFailed(kind: "address" | "changed" | "failed"): void;
};

export type MountedExpress = { destroy(): void };

const wire = (rates: ExpressRate[], currency: string) =>
  rates.map((rate) => ({
    id: rate.id,
    displayName: rate.name,
    amount: smallestUnit(rate.amount, currency),
  }));

/** Stripe's partial address as the shop's (only what a wallet shows before the payment). */
function partialOf(address: {
  country?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
}): ExpressPartialAddress {
  const optional = <K extends string>(key: K, value: string | null | undefined) =>
    value ? ({ [key]: value } as Record<K, string>) : {};
  return {
    countryCode: (address.country ?? "").toLowerCase(),
    ...optional("postalCode", address.postal_code),
    ...optional("city", address.city),
    ...optional("province", address.state),
  };
}

/**
 * Mounts Stripe's Express Checkout Element (M6 T102, D120) in `host`, in deferred mode like the
 * Payment Element (D117: the same amount, currency and manual capture), asking the wallet for the
 * e-mail and a shipping address in the region's countries. Each wallet event goes to the shop
 * through the callbacks; the payment makes a ConfirmationToken, the shop keeps it and answers the
 * session, and Stripe confirms the PaymentIntent with it.
 */
export async function mountExpressCheckout(options: ExpressOptions): Promise<MountedExpress> {
  const stripe = await stripeFor(options.publishableKey, options.locale);
  if (stripe === null) throw new Error("Stripe.js did not load");
  const currency = options.currency.toLowerCase();
  let amount = smallestUnit(options.amount, currency);
  const initial = amount;
  const elements: StripeElements = stripe.elements({
    mode: "payment",
    amount,
    currency,
    captureMethod: "manual",
    appearance: readAppearance(options.host),
  });
  const setAmount = (total: number) => {
    amount = smallestUnit(total, currency);
    elements.update({ amount });
  };
  const element = elements.create("expressCheckout", {
    emailRequired: true,
    shippingAddressRequired: true,
    allowedShippingCountries: options.countries.map((code) => code.toUpperCase()),
    shippingRates: wire(options.rates, currency),
    buttonHeight: 44,
  });
  element.on("ready", (event) => {
    const methods = Object.entries(event.availablePaymentMethods ?? {})
      .filter(([, shown]) => shown)
      .map(([name]) => name);
    options.onShown(methods);
  });
  element.on("click", (event) => event.resolve());
  element.on("shippingaddresschange", (event) => {
    void options
      .onAddress(partialOf(event.address))
      .then((answer) => {
        if (answer === null) return event.reject();
        setAmount(answer.total);
        event.resolve({ shippingRates: wire(answer.rates, currency) });
      })
      .catch(() => event.reject());
  });
  element.on("shippingratechange", (event) => {
    void options
      .onRate(event.shippingRate.id)
      .then((answer) => {
        if (answer === null) return event.reject();
        setAmount(answer.total);
        event.resolve();
      })
      .catch(() => event.reject());
  });
  element.on("cancel", () => {
    amount = initial;
    elements.update({ amount });
  });
  element.on("confirm", (event) => {
    const fail = (kind: "address" | "changed" | "failed") => {
      event.paymentFailed(kind === "address" ? { reason: "invalid_shipping_address" } : undefined);
      options.onFailed(kind);
    };
    void (async () => {
      const submitted = await elements.submit();
      if (submitted.error) return fail("failed");
      const made = await stripe.createConfirmationToken({ elements });
      if (made.error) return fail("failed");
      const shipping = event.shippingAddress;
      const billing = event.billingDetails;
      const address = shipping?.address ?? billing?.address;
      const prepared = await options.onPay({
        token: made.confirmationToken.id,
        email: billing?.email ?? "",
        name: shipping?.name ?? billing?.name ?? "",
        ...(billing?.phone ? { phone: billing.phone } : {}),
        address: {
          ...partialOf(address ?? {}),
          ...(address?.line1 ? { address1: address.line1 } : {}),
          ...(address?.line2 ? { address2: address.line2 } : {}),
        },
        shippingOption: event.shippingRate?.id ?? "",
        amount,
      });
      if ("error" in prepared) {
        if (prepared.error === "changed") {
          const total = await options.onTotal();
          if (total !== null) setAmount(total);
        }
        return fail(prepared.error);
      }
      const confirmed = await stripe.confirmPayment({
        clientSecret: prepared.clientSecret,
        confirmParams: {
          confirmation_token: made.confirmationToken.id,
          return_url: options.returnUrl,
        },
        redirect: "if_required",
      });
      if (confirmed.error) event.paymentFailed();
      options.onConfirmed({
        intentId: prepared.intentId,
        clientSecret: prepared.clientSecret,
        ...(confirmed.error ? { error: confirmed.error.message ?? "" } : {}),
      });
    })().catch(() => fail("failed"));
  });
  options.host.setAttribute("data-stripe", STRIPE_CLIENT_MARKER);
  element.mount(options.host);
  return {
    destroy() {
      element.destroy();
    },
  };
}
