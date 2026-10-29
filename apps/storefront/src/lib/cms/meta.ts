import type { SeoFields } from "../seo/meta";
import { text } from "../text";
import { mediaImage } from "./shell";

/**
 * A document's `meta` group (D82, the SEO plugin's fields) as the pages use it: the texts that have
 * something in them, and the picture when it was read populated (depth 1). Empty for none.
 */
export function metaOf(value: unknown): SeoFields {
  if (value === null || typeof value !== "object") return {};
  const meta = value as { title?: unknown; description?: unknown; image?: unknown };
  const title = text(meta.title);
  const description = text(meta.description);
  const image = mediaImage(meta.image);
  return {
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    ...(image === undefined ? {} : { image }),
  };
}
