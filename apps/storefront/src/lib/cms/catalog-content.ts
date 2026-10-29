import type { Image } from "@shopblok/registry/contracts";
import type { SeoFields } from "../seo/meta";
import { metaOf } from "./meta";
import type { LexicalState } from "./resolve/sections";
import { mediaImage } from "./shell";
import type { CatalogContentSlug } from "./tags";

// The catalog's content as the pages use it (T69): a rich text that has something in it, and the
// uploads as images. Pure, so the read (`catalog.ts`) and its tests share it.

/** A product's content: its rich description, the pictures after Medusa's, its SEO fields (T68). */
export type ProductContent = {
  description: LexicalState | null;
  gallery: Image[];
  meta: SeoFields;
};

/**
 * A category's or collection's content: its tile's picture, its listing's banner and intro, and
 * its SEO fields (T68).
 */
export type ListingContent = {
  image?: Image;
  banner?: Image;
  intro: LexicalState | null;
  meta: SeoFields;
};

export type CatalogContent<S extends CatalogContentSlug> = S extends "products"
  ? ProductContent
  : ListingContent;

/**
 * Nodes that show something without text: everything else (a paragraph, a heading, a quote, a
 * list, a link) only wraps text, and is empty without it.
 */
const SHOWN_WITHOUT_TEXT = new Set([
  "horizontalrule",
  "upload",
  "relationship",
  "block",
  "inlineBlock",
]);

/** Whether a Lexical node, or one under it, shows something: text, or a node such as a rule. */
function showsSomething(node: unknown): boolean {
  if (node === null || typeof node !== "object") return false;
  const { type, text, children } = node as { type?: unknown; text?: unknown; children?: unknown };
  if (typeof text === "string" && text.trim() !== "") return true;
  if (typeof type === "string" && SHOWN_WITHOUT_TEXT.has(type)) return true;
  return Array.isArray(children) && children.some(showsSomething);
}

/**
 * A rich text field's value, or `null` when it is empty: never written, or emptied in the editor
 * (Lexical then keeps a root with one empty block: a paragraph, or the heading, quote or list the
 * text started with), so the page falls back to Medusa's text.
 */
export function richTextOrNull(value: unknown): LexicalState | null {
  if (value === null || typeof value !== "object") return null;
  const root = (value as { root?: unknown }).root;
  return showsSomething(root) ? (value as LexicalState) : null;
}

/** An upload as an image, only when it is a picture (a video put there by hand is left out). */
function pictureOf(value: unknown): Image | undefined {
  const mimeType = (value as { mimeType?: unknown } | null)?.mimeType;
  if (typeof mimeType === "string" && !mimeType.startsWith("image/")) return undefined;
  return mediaImage(value);
}

const optional = <K extends string>(key: K, image: Image | undefined) =>
  (image === undefined ? {} : { [key]: image }) as Partial<Record<K, Image>>;

/** A document as its content (read at depth 1, the uploads populated). */
export function catalogContent<S extends CatalogContentSlug>(
  slug: S,
  doc: Record<string, unknown>,
): CatalogContent<S> {
  if (slug === "products") {
    const gallery = Array.isArray(doc["gallery"]) ? doc["gallery"] : [];
    const content: ProductContent = {
      description: richTextOrNull(doc["richDescription"]),
      gallery: gallery.flatMap((each) => pictureOf(each) ?? []),
      meta: metaOf(doc["meta"]),
    };
    return content as CatalogContent<S>;
  }
  const content: ListingContent = {
    ...optional("image", pictureOf(doc["image"])),
    ...optional("banner", pictureOf(doc["banner"])),
    intro: richTextOrNull(doc["intro"]),
    meta: metaOf(doc["meta"]),
  };
  return content as CatalogContent<S>;
}
