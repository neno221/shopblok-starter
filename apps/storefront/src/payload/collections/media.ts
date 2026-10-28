import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionConfig } from "payload";
import { isStaff } from "../access/roles";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Uploads are images only, and SVG is not one of them: an SVG can carry script, and the browser
 * runs it when the file is opened on its own URL. Size limits stay at Payload 3.92.1's defaults
 * (20 MiB per file, 3 files per request, 50 MiB per request; HTTP 413 when exceeded).
 */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "filename" },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  upload: {
    // `apps/storefront/media`, git-ignored (T01). A shared disk or bucket replaces it in production.
    staticDir: path.resolve(dirname, "../../../media"),
    mimeTypes: IMAGE_MIME_TYPES,
  },
  fields: [{ name: "alt", type: "text", localized: true, required: true }],
};
