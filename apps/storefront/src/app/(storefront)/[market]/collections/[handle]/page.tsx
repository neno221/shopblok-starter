import type { Metadata } from "next";
import {
  collectionStaticParams,
  ListingPage,
  listingMetadata,
} from "../../../../../components/listing/listing-page";
import { collectionScope } from "../../../../../lib/listing/query";

// D59 (T50): a collection's first page, in the static shell; every collection's is built (D58).
export const ensureStatic = "navigation";
// W5: the page reads its path's handle before anything is drawn (ADR 0004: `notFound()` before any
// `Suspense`), so a navigation waits for the static page; Next's dev-only instant-navigation check
// would report that read on every first load. `ensureStatic`'s own check still applies (Next's docs).
export const instant = false;

type Props = { params: Promise<{ market: string; handle: string }> };

export async function generateStaticParams({
  params,
}: {
  params: { market: string };
}): Promise<{ handle: string }[]> {
  return collectionStaticParams(params.market);
}

// Next has decoded the handle; one that is no handle (a broken escape) is a 404.
const scopeOf = async (params: Props["params"]) => collectionScope((await params).handle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return listingMetadata(await scopeOf(params), 1);
}

export default async function CollectionPage({ params }: Props) {
  return <ListingPage scope={await scopeOf(params)} page={1} />;
}
