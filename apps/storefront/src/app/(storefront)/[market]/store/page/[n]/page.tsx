import type { Metadata } from "next";
import {
  ListingPage,
  listingMetadata,
  pathPage,
} from "../../../../../../components/listing/listing-page";

// D59 (T50): the store's other pages, by path (`/store/page/2`), rendered at their first visit and
// kept in the static shell; `/store/page/1` and a page past the last are 404s.
export const ensureStatic = "navigation";
// W5: no instant-navigation check for a page that reads its path first (SETUP.md, "W5 fixes").
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
