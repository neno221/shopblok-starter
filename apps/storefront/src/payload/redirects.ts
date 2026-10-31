import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import type { Field, PayloadRequest, TextField, TextFieldSingleValidation } from "payload";
import { text } from "payload/shared";
import { encodePagePath, pagePaths } from "../lib/cms/page-path";
import { postPath } from "../lib/cms/paths";
import type { MarketMap } from "../lib/markets/types";
import { loopProblem } from "../lib/redirects/match";
import { REDIRECTS_TAG } from "../lib/cms/tags";
import {
  customUrlProblem,
  fromProblem,
  REDIRECT_TYPES,
  referenceOf,
  storedEntry,
  takenFromProblem,
  type RedirectEntry,
  type RedirectReference,
  type StoredRedirect,
} from "../lib/redirects/rules";
import { isStaff } from "./access/roles";
import { keepRefusalReason } from "./hooks/keep-refusal-reason";
import { revalidateOnPublish } from "./hooks/revalidate-on-publish";
import { keepingRequest } from "./keeping-request";
import { DEFAULT_LOCALE, LANGUAGES } from "./locales";
import { marketMap } from "./market-map";

// D82 (T68): the redirects plugin's collection, with the save checks the proxy needs and
// `revalidateOnPublish`. The plugin only stores redirects; the proxy answers them
// (`lib/redirects/`), from the list `/next/redirects` reads.

/** A localized value read with `locale: "all"`, in one language: its own, else English's. */
function inLanguage(value: unknown, language: string): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const values = value as Record<string, unknown>;
  const own = values[language];
  const chosen = typeof own === "string" && own !== "" ? own : values[DEFAULT_LOCALE];
  return typeof chosen === "string" && chosen !== "" ? chosen : undefined;
}

type Addresses = Map<string, Record<string, string>>;
const keyOf = (reference: RedirectReference) => `${reference.relationTo}:${reference.id}`;

/**
 * The published pages' and posts' addresses in every language, as the shop works them out
 * (`lib/cms/pages.ts`, `lib/cms/posts.ts`: a page's is its parents' slugs and its own, a post's
 * `/journal/<slug>`), for the pages and posts the redirects send to.
 */
async function addressesOf(
  req: PayloadRequest,
  references: readonly RedirectReference[],
): Promise<Addresses> {
  const found: Addresses = new Map();
  const add = (key: string, language: string, path: string | null | undefined) => {
    if (path === null || path === undefined) return;
    const paths = found.get(key) ?? {};
    paths[language] = path;
    found.set(key, paths);
  };
  const read = (collection: "pages" | "posts", select: Record<string, true>) =>
    keepingRequest(req, () =>
      req.payload.find({
        collection,
        locale: "all",
        depth: 0,
        select,
        where: { _status: { equals: "published" } },
        limit: 0,
        pagination: false,
        sort: "createdAt",
        overrideAccess: true,
        req,
      }),
    );
  const pageIds = references.filter((each) => each.relationTo === "pages").map((each) => each.id);
  if (pageIds.length > 0) {
    const { docs } = (await read("pages", { slug: true, title: true, parent: true })) as {
      docs: {
        id: number;
        slug?: unknown;
        title?: unknown;
        parent?: number | { id: number } | null;
      }[];
    };
    for (const language of LANGUAGES) {
      const paths = pagePaths(
        docs.map((doc) => ({
          id: doc.id,
          slug: inLanguage(doc.slug, language) ?? null,
          title: inLanguage(doc.title, language) ?? null,
          parent: doc.parent ?? null,
        })),
      );
      for (const id of pageIds) {
        const path = paths.byId[String(id)]?.path;
        add(`pages:${id}`, language, path === undefined ? null : encodePagePath(path));
      }
    }
  }
  const postIds = new Set(
    references.filter((each) => each.relationTo === "posts").map((each) => each.id),
  );
  if (postIds.size > 0) {
    const { docs } = await read("posts", { slug: true });
    for (const doc of docs) {
      if (!postIds.has(doc.id as number)) continue;
      for (const language of LANGUAGES)
        add(`posts:${String(doc.id)}`, language, postPath(inLanguage(doc.slug, language)));
    }
  }
  return found;
}

/**
 * Why saving this redirect would make a loop or a chain (D82), or `undefined`: the saved one and
 * every other, each target as the shop would send to it.
 */
async function loopOf(
  req: PayloadRequest,
  data: StoredRedirect,
  id: unknown,
  map: MarketMap,
): Promise<string | undefined> {
  const { docs } = await keepingRequest(req, () =>
    req.payload.find({
      collection: "redirects",
      depth: 0,
      select: { from: true, to: true, type: true },
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  );
  const stored = docs.filter((doc) => String(doc.id) !== String(id)) as StoredRedirect[];
  const taken = takenFromProblem(String(data.from ?? ""), stored);
  if (taken !== undefined) return taken;
  const references = [data, ...stored].flatMap((doc) => referenceOf(doc) ?? []);
  const addresses = await addressesOf(req, references);
  const entry = (doc: StoredRedirect) =>
    storedEntry(doc, (reference) => addresses.get(keyOf(reference)) ?? {});
  // The type does not change where a redirect goes: a draft of the form may not have one yet.
  const type = REDIRECT_TYPES.includes(data.type as never) ? data.type : "301";
  const candidate = entry({ ...data, type });
  if (candidate === undefined) return undefined;
  const others: RedirectEntry[] = stored.flatMap((doc) => entry(doc) ?? []);
  return loopProblem(candidate, others, map);
}

/**
 * `from`: Payload's own checks (required), then D82's: a path the proxy sees (`fromProblem`), and
 * no loop or chain with the other redirects (`loopProblem`).
 */
export const validateFrom: TextFieldSingleValidation = async (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (typeof value !== "string" || value === "") return true;
  const { req, data, id } = options;
  const map = await marketMap();
  return (
    fromProblem(value, map) ??
    (await loopOf(req, { ...(data as StoredRedirect), from: value }, id, map)) ??
    true
  );
};

/** `to.url`: Payload's own checks (required when custom), then a path or a full URL (D82). */
export const validateCustomUrl: TextFieldSingleValidation = async (value, options) => {
  const base = text(value, options);
  if (base !== true) return base;
  if (typeof value !== "string" || value === "") return true;
  return customUrlProblem(value, await marketMap()) ?? true;
};

const named = (field: Field, name: string) => "name" in field && field.name === name;

/** The plugin's fields with D82's checks and help texts. */
function redirectFields({ defaultFields }: { defaultFields: Field[] }): Field[] {
  return defaultFields.map((field): Field => {
    if (named(field, "from") && field.type === "text") {
      return {
        ...field,
        validate: validateFrom,
        admin: {
          ...field.admin,
          description:
            "The old address: /old-page applies in every market, /de/old-page in that market only.",
        },
      } as TextField;
    }
    if (named(field, "to") && field.type === "group") {
      return {
        ...field,
        fields: field.fields.map((inner): Field =>
          named(inner, "url") && inner.type === "text"
            ? ({
                ...inner,
                validate: validateCustomUrl,
                admin: {
                  ...inner.admin,
                  description:
                    "A path inside the visitor's market (/new-page), or a full URL (https://…).",
                },
              } as TextField)
            : inner,
        ),
      };
    }
    return field;
  });
}

// `{ expire: 0 }`: the proxy is the route's one reader, every 30 s, so its next read waits for the
// new list rather than taking the old one for another 30 s (stale-while-revalidate's `"max"`).
const revalidate = revalidateOnPublish({ tags: () => [REDIRECTS_TAG], profile: { expire: 0 } });

/**
 * D82: `redirects`, from the plugin. Staff write them; anyone reads them, as `/next/redirects`
 * publishes them anyway. A save expires that route's read (`redirects`), and the proxy has the
 * new list within its 30 s (`lib/redirects/proxy-redirects.ts`).
 */
export const redirects = redirectsPlugin({
  collections: ["pages", "posts"],
  redirectTypes: [...REDIRECT_TYPES],
  redirectTypeFieldOverride: {
    defaultValue: "301",
    admin: {
      description:
        "301: moved for good (most redirects). 302: for now, so browsers do not remember it. 308: for good, and a form posted to the old address is posted to the new one.",
    },
  },
  overrides: {
    admin: {
      defaultColumns: ["from", "to.type", "type", "updatedAt"],
      description:
        "Old addresses and where they go now. The shop answers a new or changed redirect within a minute.",
    },
    access: { read: () => true, create: isStaff, update: isStaff, delete: isStaff },
    hooks: { ...revalidate, afterError: [keepRefusalReason] },
    fields: redirectFields,
  },
});
