import type { PayloadRequest, TextField, TextFieldSingleValidation, Where } from "payload";
import { text } from "payload/shared";
import { pageIdOf } from "../../lib/cms/page-path";
import { keepingRequest } from "../keeping-request";
import { DEFAULT_LOCALE } from "../locales";

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

/**
 * The `slug` field's check (D80): Payload's own (required, a string) first, then `slugProblem`,
 * then that no other page under the same parent has this slug in the language being saved, so a
 * path names one page.
 */
export const validateSlug: TextFieldSingleValidation = async (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (typeof value !== "string" || value === "") return true;
  const parent = pageIdOf((options.data as Record<string, unknown> | undefined)?.["parent"]);
  const problem = slugProblem(value, { topLevel: parent === null });
  if (problem !== null) return problem;
  const { req, id } = options;
  const taken = await siblingSlugTaken(req, {
    slug: value,
    parent,
    id: pageIdOf(id),
    language: req.locale ?? undefined,
  });
  return taken ? "Another page here already has this slug." : true;
};

/** Whether another page under `parent` (`null`: the top level) has `slug` in `language`. */
export async function siblingSlugTaken(
  req: PayloadRequest,
  {
    slug,
    parent,
    id,
    language,
  }: { slug: string; parent: number | null; id: number | null; language: string | undefined },
): Promise<boolean> {
  const where: Where = {
    and: [
      { slug: { equals: slug } },
      parent === null ? { parent: { exists: false } } : { parent: { equals: parent } },
      ...(id === null ? [] : [{ id: { not_equals: id } }]),
    ],
  };
  const { totalDocs } = await req.payload.count({
    collection: "pages",
    where,
    locale: language as never,
    overrideAccess: true,
    req,
  });
  return totalDocs > 0;
}

/**
 * Why a post's slug cannot be saved, or `null` (T66, D80): a post is at `/journal/<slug>`, so its
 * slug is one segment as a page's is, and not `page`, which the journal's later pages own
 * (`/journal/page/2`, D59).
 */
export function postSlugProblem(slug: string): string | null {
  const problem = slugProblem(slug, { topLevel: false });
  if (problem !== null) return problem;
  return slug === "page"
    ? '"page" is the address of the journal\'s later pages. Choose another slug.'
    : null;
}

/** A post's slugs, by language, as a `locale: "all"` read gives them. */
type SlugsByLanguage = Record<string, string | null | undefined>;

/** The slug a language reads: its own, else the default language's (Payload's fallback). */
const slugIn = (slugs: SlugsByLanguage, language: string): string | undefined =>
  slugs[language] || slugs[DEFAULT_LOCALE] || undefined;

/**
 * Whether saving `value` as the post's slug in `language` gives it an address another post
 * already reads (PR 100 review, item 2). A language without a slug of its own reads the default
 * language's, as the shop does, and a `where` in one language would not see that: a Greek slug
 * meets another post's English one where that post has no Greek, and an English slug meets the
 * other posts' slugs in each language this post has no slug of its own in.
 */
export function postSlugTaken(
  value: string,
  language: string,
  own: SlugsByLanguage,
  others: readonly SlugsByLanguage[],
): boolean {
  const mine: SlugsByLanguage = { ...own, [language]: value };
  const languages = new Set([language]);
  if (language === DEFAULT_LOCALE)
    for (const other of others)
      for (const each of Object.keys(other)) if (!own[each]) languages.add(each);
  return others.some((other) =>
    [...languages].some((each) => slugIn(mine, each) === value && slugIn(other, each) === value),
  );
}

/**
 * A post's `slug` check: Payload's own first, then `postSlugProblem`, then that no other post
 * reads this slug in a language where this post would (`postSlugTaken`), so `/journal/<slug>`
 * names one post in every market.
 */
export const validatePostSlug: TextFieldSingleValidation = async (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (typeof value !== "string" || value === "") return true;
  const problem = postSlugProblem(value);
  if (problem !== null) return problem;
  const { req, id } = options;
  const { docs } = await keepingRequest(req, () =>
    req.payload.find({
      collection: "posts",
      locale: "all",
      depth: 0,
      select: { slug: true },
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  );
  const self = pageIdOf(id);
  const slugsOf = (doc: { slug?: unknown }): SlugsByLanguage =>
    doc.slug !== null && typeof doc.slug === "object" ? (doc.slug as SlugsByLanguage) : {};
  const own = docs.find((doc) => doc.id === self);
  const others = docs.filter((doc) => doc.id !== self).map(slugsOf);
  const language = typeof req.locale === "string" ? req.locale : DEFAULT_LOCALE;
  return postSlugTaken(value, language, own === undefined ? {} : slugsOf(own), others)
    ? "Another post already has this slug."
    : true;
};

/** A post's `slug` (T66, D80): localized, so a Greek post has a Greek address. */
export function postSlugField(): TextField {
  return {
    name: "slug",
    type: "text",
    localized: true,
    required: true,
    index: true,
    validate: validatePostSlug,
    admin: {
      position: "sidebar",
      description:
        "The post's address in the journal, /journal/…: lower-case letters, digits and hyphens.",
    },
  };
}

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
