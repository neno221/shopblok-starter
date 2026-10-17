import { z } from "zod";
import { Image } from "./image";

// What several contracts share: ids, links, times, and the content pieces a CMS block or a molecule
// shows (a category tree, an announcement, a figure). Labels here are content (a category's name,
// a menu's label), not copy: copy is `@shopblok/i18n`'s and never part of a contract (D43).

/** Medusa's or Payload's id: opaque, never empty. */
export const Id = z.string().min(1);

/** A storefront path (`/us/products/heritage-hoodie`) or an absolute http(s) URL. */
export const Href = z
  .string()
  .regex(/^(?:\/(?!\/)|https?:\/\/)/, "a path from / or an http(s) URL")
  .describe("A path from / or an http(s) URL");

/** An ISO 8601 date and time with its offset (`2026-10-01T09:00:00Z`). */
export const IsoDateTime = z.iso.datetime({ offset: true });

/** A link as content: its text and where it goes. */
export const Link = z.object({
  label: z.string().min(1),
  href: Href,
  external: z.boolean().optional().describe("Opens another site (Link's new-tab note)"),
});

/** A node of the category tree, with its children (any depth). */
export const Category = z.object({
  id: Id,
  title: z.string().min(1),
  handle: z.string().min(1),
  href: Href,
  get children() {
    return z.array(Category);
  },
});

/** The announcement bar's message (SPEC §7.3, `announcementBar`), with an optional link. */
export const Announcement = z.object({
  message: z.string().min(1),
  link: Link.optional(),
});

/** An image with its caption and credit (MediaFigure). */
export const MediaFigure = z.object({
  image: Image,
  caption: z.string().min(1).optional(),
  credit: z.string().min(1).optional(),
});

export type Id = z.infer<typeof Id>;
export type Href = z.infer<typeof Href>;
export type Link = z.infer<typeof Link>;
export type Category = z.infer<typeof Category>;
export type Announcement = z.infer<typeof Announcement>;
export type MediaFigure = z.infer<typeof MediaFigure>;
