import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionConfig } from "payload";
import { contentGlobalTags } from "../../lib/cms/globals";
import { isStaff } from "../access/roles";
import { revalidateWhenChanged } from "../hooks/revalidate-on-publish";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Uploads are images only, and SVG is not one of them: an SVG can carry script, and the browser
 * runs it when the file is opened on its own URL. A file may be 10 MiB (SPEC §7.1, the root
 * config's `upload.limits`; HTTP 413 above it).
 */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

/**
 * The sizes every image is stored in (T59, SPEC §7.1), cropped around the editor's focal point:
 * WebP for the page's own pictures, JPEG for `og` because not every crawler reads WebP. A read
 * returns each size's URL under `sizes.<name>.url`.
 */
export const IMAGE_SIZES = [
  { name: "thumb", width: 400, formatOptions: { format: "webp", options: { quality: 80 } } },
  { name: "card", width: 800, formatOptions: { format: "webp", options: { quality: 80 } } },
  { name: "hero", width: 1920, formatOptions: { format: "webp", options: { quality: 80 } } },
  {
    name: "og",
    width: 1200,
    height: 630,
    formatOptions: { format: "jpeg", options: { quality: 85 } },
  },
] satisfies NonNullable<Exclude<CollectionConfig["upload"], boolean | undefined>["imageSizes"]>;

export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "filename" },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  // The content globals embed an upload's file, size and alt text (a logo): a replaced file or a
  // new alt text refreshes them (T61).
  hooks: revalidateWhenChanged({
    fields: ["filename", "url", "alt", "width", "height"],
    tags: contentGlobalTags,
  }),
  upload: {
    // `apps/storefront/media`, git-ignored (T01). A shared disk or bucket replaces it in production.
    staticDir: path.resolve(dirname, "../../../media"),
    mimeTypes: IMAGE_MIME_TYPES,
    imageSizes: IMAGE_SIZES,
    focalPoint: true,
    // The admin's list shows the small size instead of the original.
    adminThumbnail: "thumb",
  },
  fields: [
    { name: "alt", type: "text", localized: true, required: true },
    { name: "caption", type: "textarea", localized: true },
  ],
};
