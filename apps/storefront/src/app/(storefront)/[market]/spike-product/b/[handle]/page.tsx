import { spikeStaticParams } from "../../../../../../lib/spike-s4/catalog";
import { SpikeProductPage } from "../../../../../../lib/spike-s4/product-view";

// THROWAWAY spike code (plan M1 §6, S4), variant B: the product is read in the shell through
// `cached()`, there is no `Suspense`, and `ensureStatic` makes the build refuse anything that would
// render this route on request. B2 is this page without the export.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return spikeStaticParams();
}

export default async function SpikeProductB({
  params,
}: PageProps<"/[market]/spike-product/b/[handle]">) {
  // Awaited here, outside any `Suspense`, so that `notFound()` below it is a real 404.
  const { handle } = await params;
  return <SpikeProductPage variant="B" handle={handle} />;
}
