import type { TextField, TextFieldSingleValidation, Where } from "payload";
import { text } from "payload/shared";

// D80's slugs: a page's address is its parents' slugs and its own (`/about/team`), in the market's
// language, so a slug is one path segment that every language can write and no route already owns.

/**
 * SPEC §8.1's reserved segments and the shop's own routes under `{m}/`: a top-level page may not
 * take one, or it would hide the shop's page (or be hidden by it).
 */
export const RESERVED_SEGMENTS: readonly string[] = [
  // Reserved: the admin, the APIs, the design system and Next's own routes.
  "admin",
  "api",
  "design-system",
  "next",
  // The shop's routes (SPEC §8.1).
  "account",
  "cart",
  "categories",
  "checkout",
  "collections",
  "forgot-password",
  "journal",
  "login",
  "order",
  "products",
  "register",
  "reset-password",
  "search",
  "store",
  "verify",
];

/**
 * Lower-case letters of any script (and their marks), digits and single hyphens between them: `team`,
 * `σχετικά-με-εμάς`, `über-uns`. No capitals, spaces, slashes, dots or underscores, so a path segment
 * reads the same written and encoded.
 */
const SLUG =
  /^[\p{Ll}\p{Lo}\p{Nd}][\p{Ll}\p{Lo}\p{M}\p{Nd}]*(?:-[\p{Ll}\p{Lo}\p{Nd}][\p{Ll}\p{Lo}\p{M}\p{Nd}]*)*$/u;

/** Two letters: a market's segment (`/us`, `/de`), which the proxy reads before any page. */
const MARKET_SEGMENT = /^\p{L}{2}$/u;

/**
 * Why a slug cannot be saved, or `null` when it can. `topLevel`: the page has no parent, so its slug
 * is the first segment of its address and must not be a market's or a route's.
 */
export function slugProblem(slug: string, { topLevel }: { topLevel: boolean }): string | null {
  if (!SLUG.test(slug)) {
    return "Use lower-case letters, digits and hyphens (for example: about-us).";
  }
  if (!topLevel) return null;
  if (RESERVED_SEGMENTS.includes(slug)) {
    return `"${slug}" is one of the shop's own addresses. Choose another slug, or put the page under a parent.`;
  }
  if (MARKET_SEGMENT.test(slug)) {
    return "Two letters are a market's address (like /us). Use a longer slug, or put the page under a parent.";
  }
  return null;
}

const parentId = (data: Record<string, unknown> | undefined): number | string | null => {
  const parent = data?.["parent"];
  if (parent === null || parent === undefined || parent === "") return null;
  if (typeof parent === "object") return (parent as { id: number | string }).id;
  return parent as number | string;
};

/**
 * The `slug` field's check (D80): Payload's own (required, a string) first, then `slugProblem`,
 * then that no other page under the same parent has this slug in the language being saved, so a
 * path names one page.
 */
export const validateSlug: TextFieldSingleValidation = async (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (typeof value !== "string" || value === "") return true;
  const parent = parentId(options.data as Record<string, unknown> | undefined);
  const problem = slugProblem(value, { topLevel: parent === null });
  if (problem !== null) return problem;
  const { req, id } = options;
  const where: Where = {
    and: [
      { slug: { equals: value } },
      parent === null ? { parent: { exists: false } } : { parent: { equals: parent } },
      ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
    ],
  };
  const { totalDocs } = await req.payload.count({
    collection: "pages",
    where,
    locale: (req.locale ?? undefined) as never,
    overrideAccess: true,
    req,
  });
  return totalDocs === 0 ? true : "Another page here already has this slug.";
};

/** A page's `slug` (D80): localized, so a Greek page has a Greek address. */
export function slugField(): TextField {
  return {
    name: "slug",
    type: "text",
    localized: true,
    required: true,
    index: true,
    validate: validateSlug,
    admin: {
      position: "sidebar",
      description:
        "The page's address under its parent: lower-case letters, digits and hyphens (about-us).",
    },
  };
}
