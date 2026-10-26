import type { Metadata } from "next";
import { ListingPage, listingMetadata } from "../../../../components/listing/listing-page";

// D59 (T50): every product, first page, in the static shell (`listing-page.tsx`).
export const ensureStatic = "navigation";

export async function generateMetadata(): Promise<Metadata> {
  return listingMetadata({ kind: "store" }, 1);
}

export default function StorePage() {
  return <ListingPage scope={{ kind: "store" }} page={1} />;
}
