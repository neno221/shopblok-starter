import type { Metadata } from "next";
import {
  ListingPage,
  listingMetadata,
  pathPage,
} from "../../../../../../components/listing/listing-page";

// D59 (T50): the store's other pages, by path (`/store/page/2`), rendered at their first visit and
// kept in the static shell; `/store/page/1` and a page past the last are 404s.
export const ensureStatic = "navigation";
// W5: the page reads its path's handle before anything is drawn (ADR 0004: `notFound()` before any
// `Suspense`), so a navigation waits for the static page; Next's dev-only instant-navigation check
// would report that read on every first load. `ensureStatic`'s own check still applies (Next's docs).
export const instant = false;

type Props = { params: Promise<{ market: string; n: string }> };

/** Cache Components refuse an empty list: `1`, a 404, stands for the pages rendered on demand. */
export async function generateStaticParams(): Promise<{ n: string }[]> {
  return [{ n: "1" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return listingMetadata({ kind: "store" }, pathPage((await params).n));
}

export default async function StorePagedPage({ params }: Props) {
  return <ListingPage scope={{ kind: "store" }} page={pathPage((await params).n)} />;
}
