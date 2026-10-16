import { Suspense } from "react";
import { spikeStaticParams } from "../../../../../../lib/spike-s4/catalog";
import { SpikeProductPage } from "../../../../../../lib/spike-s4/product-view";
import { VisitorPartClient } from "../../../../../../lib/spike-s4/visitor-part-client";

// THROWAWAY spike code (plan M1 §6, S4), variant B4: B plus a per-visitor part behind `Suspense`
// that is a Client Component reading `document.cookie` in an effect, so no server request-time API
// is involved. Does it pass `ensureStatic = "navigation"` where B3 (the same part, on the server)
// is expected to fail?
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return spikeStaticParams();
}

export default async function SpikeProductB4({
  params,
}: PageProps<"/[market]/spike-product/b4/[handle]">) {
  // Awaited here, outside any `Suspense`, exactly as in B.
  const { handle } = await params;
  return (
    <SpikeProductPage variant="B4" handle={handle}>
      <Suspense fallback={<p className="mt-4">…</p>}>
        <VisitorPartClient />
      </Suspense>
    </SpikeProductPage>
  );
}
