import { spikeStaticParams } from "../../../../../../lib/spike-s4/catalog";
import { SpikeProductPage } from "../../../../../../lib/spike-s4/product-view";

// THROWAWAY spike code (plan M1 §6, S4), variant B2: B without `ensureStatic`, to measure what the
// export adds now that `partialPrefetching` is on.
export function generateStaticParams() {
  return spikeStaticParams();
}

export default async function SpikeProductB2({
  params,
}: PageProps<"/[market]/spike-product/b2/[handle]">) {
  // Awaited here, outside any `Suspense`, exactly as in B.
  const { handle } = await params;
  return <SpikeProductPage variant="B2" handle={handle} />;
}
