import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { localeHeaders, medusaRequest } from "./sdk";

export type CollectionDto = { id: string; handle: string; title: string };

type WireCollection = { id: string; handle?: string | null; title?: string | null };

const PAGE_SIZE = 100;

async function fetchCollections(locale: string): Promise<CollectionDto[]> {
  const collections: CollectionDto[] = [];
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.collection.list(
        { fields: "id,handle,title", limit: PAGE_SIZE, offset },
        localeHeaders(locale),
      ),
    );
    for (const row of page.collections as unknown as WireCollection[])
      if (row.handle && row.title)
        collections.push({ id: row.id, handle: row.handle, title: row.title });
    offset += page.collections.length;
    if (page.collections.length === 0 || offset >= page.count) return collections;
  }
}

/** Every collection in a locale: the listing pages' handles and the search's `collection_ids` labels. */
export const listCollections = cached(fetchCollections, {
  name: "medusa:collections",
  tags: ["medusa:collections", "search"],
  life: CATALOG_LIFE,
});
