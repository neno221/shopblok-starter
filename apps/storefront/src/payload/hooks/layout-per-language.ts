import { randomBytes } from "node:crypto";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { DEFAULT_LOCALE, LANGUAGES } from "../locales";
import { keepingRequest } from "../keeping-request";

/** `req.context` key: this save is one of the copies, so it starts nothing. */
const COPYING = "copyingLayoutPerLanguage";
/** `req.context` key: the switch went on in this save; afterChange copies the other languages. */
const COPY_OTHERS = "copyLayoutIntoOtherLanguages";

type Data = Record<string, unknown>;
type Id = number | string;

/** A block's or an array row's id, as Payload makes them (24 hex digits, like a Mongo ObjectId). */
const ROW_ID = /^[0-9a-f]{24}$/;

/**
 * A copy of blocks with new ids for the blocks and their array rows (Payload's own "copy to locale"
 * does the same): a localized blocks field keeps every language's rows in one table, whose key is
 * the row's id, so copies that kept them would clash. Relationship ids are numbers and stay.
 */
export function copyBlocks(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copyBlocks);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, each]) =>
      key === "id" && typeof each === "string" && ROW_ID.test(each)
        ? [key, randomBytes(12).toString("hex")]
        : [key, copyBlocks(each)],
    ),
  );
}

const hasBlocks = (value: unknown) => Array.isArray(value) && value.length > 0;

/** Whether this save switches `layoutPerLanguage` on (it was off, or the page is new). */
const switchesOn = (data: Data, originalDoc: Data | undefined) =>
  data["layoutPerLanguage"] === true && originalDoc?.["layoutPerLanguage"] !== true;

/**
 * The page's latest version in `language`: its shared layout as a visitor of that language reads it
 * (English's text where it has none, `layout`), its own layout without the fallback
 * (`localizedLayout`, empty when it has none), and its slugs in every language (`slug`).
 */
async function readLatest(
  req: PayloadRequest,
  id: Id,
  language: string,
): Promise<{ layout: unknown; own: unknown; languages: string[] } | null> {
  const read = (locale: string, fallbackLocale: string | false) =>
    keepingRequest(req, () =>
      req.payload.findByID({
        collection: "pages",
        id,
        locale: locale as never,
        fallbackLocale: fallbackLocale as never,
        draft: true,
        depth: 0,
        select: { slug: true, layout: true, localizedLayout: true },
        disableErrors: true,
        overrideAccess: true,
        req,
      }),
    ) as Promise<Data | null>;
  // One after another: each call sets `req.locale` to its own while it runs, and they share `req`.
  const withFallback = await read(language, DEFAULT_LOCALE);
  const own = await read(language, false);
  const all = await read("all", false);
  if (withFallback === null || own === null || all === null) return null;
  const slugs = (all["slug"] ?? {}) as Record<string, unknown>;
  return {
    layout: withFallback["layout"] ?? [],
    own: own["localizedLayout"],
    languages: LANGUAGES.filter((each) => Boolean(slugs[each])),
  };
}

/**
 * D105: switching a page's own layout per language on copies its shared `layout` into the
 * `localizedLayout` of English and of every language the page is translated into (has a slug of
 * its own in), each with the texts its visitors read now, so the switch changes nothing anyone sees
 * until an editor changes a language's blocks. A language the page is not translated into shows
 * English's (Payload's fallback). A language that already has blocks of its own keeps them (the
 * switch went off and on again).
 *
 * - **The language being saved:** the copy is part of this save. In English it is the layout being
 *   saved; in another language the latest saved version's, with English's text where the language
 *   has none (the admin's form leaves untranslated texts empty).
 * - **The others:** `copyLayoutIntoOtherLanguages` saves each right after this save, as a draft when
 *   this save was one, English first.
 */
export const copyLayoutOnSwitch: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (req.context[COPYING] === true || !switchesOn(data, originalDoc)) return data;
  req.context[COPY_OTHERS] = true;
  if (hasBlocks(data["localizedLayout"])) return data;
  const language = req.locale ?? DEFAULT_LOCALE;
  if (language === DEFAULT_LOCALE || originalDoc?.["id"] == null) {
    data["localizedLayout"] = copyBlocks(data["layout"] ?? originalDoc?.["layout"] ?? []);
    return data;
  }
  const latest = await readLatest(req, originalDoc["id"] as Id, language);
  if (latest !== null && !hasBlocks(latest.own))
    data["localizedLayout"] = copyBlocks(latest.layout);
  return data;
};

/** The other languages' half of `copyLayoutOnSwitch`. */
export const copyLayoutIntoOtherLanguages: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.context[COPY_OTHERS] !== true) return doc;
  delete req.context[COPY_OTHERS];
  const saved = req.locale ?? DEFAULT_LOCALE;
  const first = await readLatest(req, doc.id, DEFAULT_LOCALE);
  if (first === null) return doc;
  const others = [DEFAULT_LOCALE, ...first.languages.filter((each) => each !== DEFAULT_LOCALE)];
  for (const language of others) {
    if (language === saved) continue;
    const latest = language === DEFAULT_LOCALE ? first : await readLatest(req, doc.id, language);
    if (latest === null || hasBlocks(latest.own)) continue;
    await keepingRequest(req, () =>
      req.payload.update({
        collection: "pages",
        id: doc.id,
        locale: language as never,
        // A draft stays a draft: a copy must not publish what the editor has only saved.
        draft: doc._status !== "published",
        data: { localizedLayout: copyBlocks(latest.layout) } as never,
        overrideAccess: true,
        context: { ...req.context, [COPYING]: true },
        req,
      }),
    );
  }
  return doc;
};
