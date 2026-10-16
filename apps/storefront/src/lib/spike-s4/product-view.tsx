import { formatMoney } from "@shopblok/i18n";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "server-only";
import { getCurrentMarket } from "../current-market";
import { getRegionForCountry } from "../medusa/regions";
import { BUILD_STAND_IN, getProductByHandle } from "./catalog";

// THROWAWAY spike code (plan M1 §6, S4). One body for variants A, B, B2, B3 and B4, so that the only
// difference between them is where the data is read: in the shell (B, B2) or behind `Suspense` (A),
// and, for B3 and B4, how a per-visitor part is read after the product.

export type SpikeVariant = "A" | "B" | "B2" | "B3" | "B4";

/** The heading and the marker `curl` greps to tell the variants apart. */
export function SpikeHeader({ variant }: { variant: SpikeVariant }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Spike S4: product page</h1>
      <p className="mt-2">
        Variant <span data-testid="spike-variant">{variant}</span>
      </p>
    </>
  );
}

/**
 * Reads the product and shows it, or answers 404 with `notFound()`. Where this renders decides
 * what a missing product or a Medusa outage does: in the shell, before any `Suspense`, it is a real
 * 404 or 5xx; behind `Suspense`, the status is already 200.
 */
export async function SpikeProductDetails({ handle }: { handle: string }) {
  // The stand-in exists only so that a build with no backend has a param to prerender; it must
  // never reach Medusa, or a build with no backend would fail on it.
  if (handle === BUILD_STAND_IN) notFound();
  const market = await getCurrentMarket();
  const region = await getRegionForCountry(market.country);
  if (region === undefined) notFound();
  const { product, fetchedAt } = await getProductByHandle({
    handle,
    regionId: region.id,
    locale: market.medusaLocale,
  });
  if (product === null) notFound();
  return (
    <section className="mt-4">
      <h2 className="text-xl font-semibold" data-testid="product-title">
        {product.title}
      </h2>
      <p data-testid="product-price">
        {product.price === null
          ? "–"
          : formatMoney(product.price.amount, product.price.currencyCode, market.htmlLang)}
      </p>
      <p>
        Read from Medusa at{" "}
        <time data-testid="fetched-at" dateTime={fetchedAt}>
          {fetchedAt}
        </time>
      </p>
    </section>
  );
}

/**
 * The whole page of B, B2, B3 and B4, which read the product in the shell. `children` render after
 * the product, inside `<main>`: B3 and B4 put their per-visitor part there.
 */
export function SpikeProductPage({
  variant,
  handle,
  children,
}: {
  variant: SpikeVariant;
  handle: string;
  children?: ReactNode;
}) {
  return (
    <main className="p-8">
      <SpikeHeader variant={variant} />
      <SpikeProductDetails handle={handle} />
      {children}
    </main>
  );
}
