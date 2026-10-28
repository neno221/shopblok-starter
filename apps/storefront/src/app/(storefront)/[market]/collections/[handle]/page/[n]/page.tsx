import type { Metadata } from "next";
import {
  ListingPage,
  listingMetadata,
  pathPage,
} from "../../../../../../../components/listing/listing-page";
import { collectionScope } from "../../../../../../../lib/listing/query";
import { PLACEHOLDER_HANDLE } from "../../../../../../../lib/prerender";

// D59 (T50): a collection's other pages, by path (`/collections/summer-edit/page/2`), rendered at
// their first visit; `/page/1` and a page past the last are 404s.
export const ensureStatic = "navigation";
// W5: the page reads its path's handle before anything is drawn (ADR 0004: `notFound()` before any
// `Suspense`), so a navigation waits for the static page; Next's dev-only instant-navigation check
// would report that read on every first load. `ensureStatic`'s own check still applies (Next's docs).
export const instant = false;

type Props = { params: Promise<{ market: string; handle: string; n: string }> };

/**
 * Cache Components refuse an empty list, and `ensureStatic` wants every parameter: the placeholder's
 * `/page/1`, a 404, stands for the pages rendered on demand.
 */
export async function generateStaticParams(): Promise<{ handle: string; n: string }[]> {
  return [{ handle: PLACEHOLDER_HANDLE, n: "1" }];
}

async function read(params: Props["params"]) {
  const { handle, n } = await params;
  return { scope: collectionScope(handle), page: pathPage(n) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scope, page } = await read(params);
  return listingMetadata(scope, page);
}

export default async function CollectionPagedPage({ params }: Props) {
  const { scope, page } = await read(params);
  return <ListingPage scope={scope} page={page} />;
}
