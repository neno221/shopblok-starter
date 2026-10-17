import { z } from "zod";
import { Href, Link } from "./content";
import { Image } from "./image";

// The header's `navigation.items[]` (SPEC §7.3): a link, a dropdown of links, or a mega menu whose
// columns come from the category tree or from manual entries. The labels are content (Payload's,
// localized), not copy.

export const NavLink = z.object({ kind: z.literal("link"), label: z.string().min(1), href: Href });

export const NavDropdown = z.object({
  kind: z.literal("dropdown"),
  label: z.string().min(1),
  items: z.array(Link).min(1),
});

export const MegaMenuColumn = z.object({
  title: z.string().min(1),
  href: Href.optional(),
  links: z.array(Link).min(1),
});

/** A promoted tile beside a mega menu's columns: at most two. */
export const MegaMenuFeature = z.object({ title: z.string().min(1), href: Href, image: Image });

export const NavMegaMenu = z.object({
  kind: z.literal("megaMenu"),
  label: z.string().min(1),
  href: Href.optional().describe("Where the label goes when it is a link too"),
  columns: z.array(MegaMenuColumn).min(1),
  featured: z.array(MegaMenuFeature).max(2),
});

export const NavItem = z.discriminatedUnion("kind", [NavLink, NavDropdown, NavMegaMenu]);

/** A column of the footer (`footer.columns[]`). */
export const FooterColumn = z.object({ title: z.string().min(1), links: z.array(Link).min(1) });

export type NavLink = z.infer<typeof NavLink>;
export type NavDropdown = z.infer<typeof NavDropdown>;
export type MegaMenuColumn = z.infer<typeof MegaMenuColumn>;
export type MegaMenuFeature = z.infer<typeof MegaMenuFeature>;
export type NavMegaMenu = z.infer<typeof NavMegaMenu>;
export type NavItem = z.infer<typeof NavItem>;
export type FooterColumn = z.infer<typeof FooterColumn>;
