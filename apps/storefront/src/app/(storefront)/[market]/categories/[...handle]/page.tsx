import type { Metadata } from "next";
import {
  categorySegments,
  categoryStaticParams,
  ListingPage,
  listingMetadata,
} from "../../../../../components/listing/listing-page";

// D59 (T50): a category and its children's products, by its path of handles
// (`/categories/apparel/tops`), its other pages by a trailing `page/{n}`
// (`/categories/apparel/page/2`). Every category's first page is built (D58).
export const ensureStatic = "navigation";

type Props = { params: Promise<{ market: string; handle: string[] }> };

export async function generateStaticParams({
  params,
}: {
  params: { market: string };
}): Promise<{ handle: string[] }[]> {
  return categoryStaticParams(params.market);
}

const read = async (params: Props["params"]) => categorySegments((await params).handle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scope, page } = await read(params);
  return listingMetadata(scope, page);
}

export default async function CategoryPage({ params }: Props) {
  const { scope, page } = await read(params);
  return <ListingPage scope={scope} page={page} />;
}
