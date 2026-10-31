import { seoPlugin } from "@payloadcms/plugin-seo";
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from "@payloadcms/plugin-seo/fields";
import type {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
} from "@payloadcms/plugin-seo/types";
import type { Field, GroupField, PayloadRequest } from "payload";
import { CMS_PATHS } from "../lib/cms/paths";
import { buildPublicUrl } from "../lib/markets/url";
import { applyTitleTemplate, titleTemplateOf } from "../lib/seo/meta";
import { SITE } from "../lib/site";
import { siteOrigin } from "../lib/site-origin";
import { text } from "../lib/text";
import { isStaffField } from "./access/roles";
import { pagePreviewPath, previewMarket } from "./live-preview";
import { DEFAULT_LOCALE } from "./locales";
import { marketMapOrUndefined } from "./market-map";

// D82 (T68): the SEO plugin's `meta` group (`meta.title`ᴸ, `meta.description`ᴸ, `meta.image`) on
// the pages and the posts through the plugin, and on the synced collections as their content
// (T69's `content` option): Payload's plugin only adds fields to the collections it is given, and
// there they would be writable by the sync. The suggestions ("Auto-generate") come from the
// document and the site settings: the title in the site's title template, the post's summary or
// the site's description, the post's picture or the site's.

type SiteSettingsSeo = {
  storeName?: unknown;
  seo?: { titleTemplate?: unknown; description?: unknown; image?: unknown } | null;
};

/** The site settings in the language being edited (their English where it has none). */
async function siteSettings(req: PayloadRequest, locale: string | undefined) {
  return (await req.payload.findGlobal({
    slug: "site-settings",
    locale: (locale ?? DEFAULT_LOCALE) as never,
    depth: 0,
    overrideAccess: true,
    req,
  })) as SiteSettingsSeo;
}

const idOf = (value: unknown): number | string | undefined => {
  const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof id === "number" || (typeof id === "string" && id !== "") ? id : undefined;
};

/** The document's title in the site's title template: what the page's `<title>` would be. */
export const generateTitle: GenerateTitle = async ({ doc, locale, req }) => {
  const title = text((doc as { title?: unknown } | undefined)?.title);
  if (title === undefined) return "";
  const settings = await siteSettings(req, locale);
  const storeName = text(settings.storeName) ?? SITE.storeName;
  return applyTitleTemplate(titleTemplateOf(text(settings.seo?.titleTemplate), storeName), title);
};

/** A post's summary; for anything else, the site's description. */
export const generateDescription: GenerateDescription = async ({ doc, locale, req }) => {
  const excerpt = text((doc as { excerpt?: unknown } | undefined)?.excerpt);
  if (excerpt !== undefined) return excerpt;
  return text((await siteSettings(req, locale)).seo?.description) ?? "";
};

/** A post's picture; for anything else, the site's. */
export const generateImage: GenerateImage = async ({ doc, locale, req }) => {
  const hero = idOf((doc as { hero?: unknown } | undefined)?.hero);
  if (hero !== undefined) return hero;
  return idOf((await siteSettings(req, locale)).seo?.image) ?? "";
};

/** The document's address in the market the language is previewed in (live preview's, D74). */
export const generateURL: GenerateURL = async ({ collectionConfig, doc, locale, req }) => {
  const slug = collectionConfig?.slug;
  const language = locale ?? DEFAULT_LOCALE;
  const data = (doc ?? {}) as Record<string, unknown>;
  const path =
    slug === "pages"
      ? await pagePreviewPath(req.payload, data, language)
      : slug === undefined
        ? null
        : (CMS_PATHS[slug]?.(data) ?? null);
  if (path === null) return "";
  // Medusa down on a server that has read no map yet: no suggestion, like an unknown market (T75
  // review, item 3).
  const map = await marketMapOrUndefined(req, "the generated URL is left empty");
  if (map === undefined) return "";
  const market = previewMarket(map, language);
  return market === undefined ? "" : new URL(buildPublicUrl(market, path, map), siteOrigin()).href;
};

/**
 * The `meta` group's fields, as the plugin adds them: the overview, the title, the description,
 * the picture (from `media`) and the search-result preview, each "Auto-generate" button on.
 */
export const seoFields = (): Field[] => [
  OverviewField({}),
  MetaTitleField({ hasGenerateFn: true }),
  MetaDescriptionField({ hasGenerateFn: true }),
  MetaImageField({ hasGenerateFn: true, relationTo: "media" }),
  PreviewField({ hasGenerateFn: true }),
];

/**
 * The `meta` group for a synced collection (D82, T69's content): staff write it, never the sync,
 * and it is published on save, as the collection has no drafts. `custom.content` marks it for
 * `synced.test.ts`.
 */
export function metaContentField(): GroupField {
  return {
    name: "meta",
    type: "group",
    label: "SEO",
    access: { create: isStaffField, update: isStaffField },
    custom: { content: true },
    admin: {
      description:
        "The title, description and picture search engines and shared links show. Empty: the page's own.",
    },
    fields: seoFields(),
  };
}

/** D82: the plugin, on the pages and the posts, with the suggestions above. */
export const seo = seoPlugin({
  collections: ["pages", "posts"],
  uploadsCollection: "media",
  fields: () => seoFields(),
  generateTitle,
  generateDescription,
  generateImage,
  generateURL,
});
