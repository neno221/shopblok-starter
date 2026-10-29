import { EDITORIAL_LIST_MAX } from "@shopblok/registry/contracts";
import { headingField, sectionBlock } from "./section-block";

/** Where an editorial list's posts come from: the newest, or the editor's own list. */
export const EDITORIAL_SOURCES = ["newest", "handpicked"] as const;

type Sibling = { source?: string | null };
const when = (source: string) => (_: unknown, sibling: Sibling) => sibling?.source === source;

/**
 * `editorialList` (SPEC §7.4, D79, T66): posts of the journal, in the market's language: the
 * newest (as many as the editor says) or the editor's picks in their order, with the journal's link
 * unless the editor turns it off. A post that is not published (or not yet in a language's market)
 * is left out of the list; a list with nothing left is not drawn.
 */
export const EditorialListBlock = sectionBlock({
  slug: "editorialList",
  interfaceName: "EditorialListBlock",
  plural: "Editorial lists",
  fields: [
    headingField,
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "newest",
      options: [
        { value: "newest", label: "The newest posts" },
        { value: "handpicked", label: "Posts I pick" },
      ],
    },
    {
      name: "limit",
      type: "number",
      required: true,
      min: 1,
      max: EDITORIAL_LIST_MAX,
      defaultValue: 3,
      admin: { step: 1, condition: when("newest") },
    },
    {
      name: "posts",
      type: "relationship",
      relationTo: "posts",
      hasMany: true,
      required: true,
      maxRows: EDITORIAL_LIST_MAX,
      admin: { condition: when("handpicked"), description: "Shown in this order." },
    },
    {
      name: "showLink",
      type: "checkbox",
      label: "Link to the journal",
      defaultValue: true,
    },
  ],
});
