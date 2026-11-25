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
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${((a ?? 0) / 255).toFixed(3)})`;
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
