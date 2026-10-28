import type { Metadata } from "next";
import {
  collectionStaticParams,
  ListingPage,
  listingMetadata,
} from "../../../../../components/listing/listing-page";
import { collectionScope } from "../../../../../lib/listing/query";

// D59 (T50): a collection's first page, in the static shell; every collection's is built (D58).
export const ensureStatic = "navigation";
// W5: no instant-navigation check for a page that reads its path first (SETUP.md, "W5 fixes").
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
