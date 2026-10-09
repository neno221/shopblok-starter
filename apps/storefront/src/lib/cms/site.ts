import "server-only";
import { cached } from "../cache";
import { getPayloadClient } from "./payload";

/**
 * How many pages the CMS has published, read through the Local API (M0's proof that Payload is
 * wired in; the site settings and the page reads come with M4). Drafts are not counted. Tag
 * `payload:pages` is for the `pages` hook that revalidates it.
 */
export const countPublishedPages = cached(
  async (): Promise<number> => {
    const payload = await getPayloadClient();
    const { totalDocs } = await payload.count({
      collection: "pages",
      where: { _status: { equals: "published" } },
    });
    return totalDocs;
  },
  { name: "cms:pages:count", tags: ["payload:pages"], life: "minutes" },
);
