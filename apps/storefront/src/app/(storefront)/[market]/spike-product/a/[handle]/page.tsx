import { connection } from "next/server";
import { Suspense } from "react";
import { BUILD_STAND_IN } from "../../../../../../lib/spike-s4/catalog";
import { SpikeHeader, SpikeProductDetails } from "../../../../../../lib/spike-s4/product-view";

// THROWAWAY spike code (plan M1 §6, S4), variant A: the wiring page's pattern. The shell has the
// heading, and the product streams in behind `Suspense`, so a failure or a `notFound()` there
// comes after the status line (T12).

// A never asks Medusa at build time: `connection()` keeps the streamed part out of the prerender,
// and the stand-in is the only param, so a build with no backend and one with a backend that is
// down both pass.
export function generateStaticParams() {
  return [{ handle: BUILD_STAND_IN }];
}

type SpikeParams = Pick<PageProps<"/[market]/spike-product/a/[handle]">, "params">;

export default function SpikeProductA({ params }: SpikeParams) {
  return (
    <main className="p-8">
      <SpikeHeader variant="A" />
      <Suspense fallback={<p className="mt-4">…</p>}>
        <StreamedProduct params={params} />
      </Suspense>
    </main>
  );
}

async function StreamedProduct({ params }: SpikeParams) {
  await connection();
  const { handle } = await params;
  return <SpikeProductDetails handle={handle} />;
}
