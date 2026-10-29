import {
  HeadingFeature,
  lexicalEditor,
  LinkFeature,
  type FeatureProviderServer,
} from "@payloadcms/richtext-lexical";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";

/**
 * The default features a block's rich text leaves out: pictures and relationships (a block has its
 * own media fields, and the page's renderer draws neither), the checklist, code, sub- and
 * superscript, indents and alignment (the theme sets those). Headings and links are replaced below.
 */
const LEFT_OUT = new Set([
  "upload",
  "relationship",
  "checklist",
  "inlineCode",
  "subscript",
  "superscript",
  "indent",
  "align",
  "heading",
  "link",
]);

type HeadingSize = "h2" | "h3" | "h4";

/**
 * The editor of a block's rich text (T63): paragraphs, `h2` to `h4` (the page's title is its
 * `h1`), lists, quotes, rules, the inline styles, and links. An internal link points at a catalog
 * document (SPEC §7.5) and resolves to the current market's URL when the page renders, as the
 * `link` field's do; a custom one is checked again there (`isSafeLinkUrl`).
 */
export const sectionEditor = textEditor(["h2", "h3", "h4"]);

/**
 * The same editor with other heading levels: a product's description sits in a section of the
 * product page whose title is an `h2`, so its own headings start at `h3` (T69).
 */
export function textEditor(headings: HeadingSize[]) {
  return lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter(
        (feature: FeatureProviderServer<unknown, unknown, unknown>) => !LEFT_OUT.has(feature.key),
      ),
      HeadingFeature({ enabledHeadingSizes: headings }),
      LinkFeature({ enabledCollections: [...CATALOG_COLLECTIONS] }),
    ],
  });
}
