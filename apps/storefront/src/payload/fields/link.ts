import type { CollectionSlug, Field, GroupField } from "payload";
import { isSafeLinkUrl } from "../../lib/cms/link";

export type LinkAppearance = "default" | "outline" | "text";

export type LinkFieldOptions = {
  /** The field's name; `link` by default. */
  name?: string;
  /**
   * The collections an internal link may point to (SPEC §7.5: page, category, collection, product,
   * post). Empty until they exist: T60 adds the synced catalog, T65 `pages`' route, T66 `posts`.
   * Without any, the field offers a custom URL only.
   */
  relationTo?: CollectionSlug[];
  /** The looks a block offers; none hides the choice. */
  appearances?: LinkAppearance[];
  /** Whether a label is asked for (a menu item needs one; a card's whole-surface link may not). */
  label?: boolean;
  required?: boolean;
};

/**
 * The reusable `link` field (SPEC §7.5, D79): an internal reference or a custom URL, a label in
 * each language, `newTab` and an appearance. It stores a reference, never a URL, for anything
 * internal: `resolveLink` (`lib/cms/link.ts`) turns it into the current market's public URL when
 * the page renders, so one link works in every market.
 */
export function link({
  name = "link",
  relationTo = [],
  appearances = [],
  label = true,
  required = true,
}: LinkFieldOptions = {}): GroupField {
  const internal = relationTo.length > 0;
  const fields: Field[] = [
    {
      name: "type",
      type: "radio",
      defaultValue: internal ? "reference" : "custom",
      options: [
        ...(internal ? [{ label: "Internal link", value: "reference" }] : []),
        { label: "Custom URL", value: "custom" },
      ],
      admin: { layout: "horizontal" },
    },
    ...(internal
      ? [
          {
            name: "reference",
            type: "relationship",
            relationTo,
            maxDepth: 1,
            required,
            admin: {
              condition: (_: unknown, sibling: { type?: string }) => sibling?.type === "reference",
            },
          } satisfies Field,
        ]
      : []),
    {
      name: "url",
      type: "text",
      required,
      // A path inside the market (`/sale`), or https, mailto or tel. `javascript:` and the like are
      // refused here, and again by `resolveLink`.
      validate: (value: string | null | undefined) =>
        value == null || value === "" || isSafeLinkUrl(value)
          ? true
          : "Use a path starting with /, or an https, mailto or tel link.",
      admin: { condition: (_: unknown, sibling: { type?: string }) => sibling?.type === "custom" },
    },
    ...(label ? [{ name: "label", type: "text", localized: true, required } satisfies Field] : []),
    { name: "newTab", type: "checkbox", label: "Open in a new tab" },
    ...(appearances.length > 0
      ? [
          {
            name: "appearance",
            type: "select",
            defaultValue: appearances[0],
            options: appearances,
          } satisfies Field,
        ]
      : []),
  ];
  return { name, type: "group", admin: { hideGutter: true }, fields };
}
