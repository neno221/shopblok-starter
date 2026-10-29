import type {
  CollectionSlug,
  Field,
  FilterOptions,
  GroupField,
  TextFieldSingleValidation,
} from "payload";
import { text } from "payload/shared";
import { isSafeLinkUrl } from "../../lib/cms/link";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";

export type LinkAppearance = "default" | "outline" | "text";

export type LinkFieldOptions = {
  /** The field's name; `link` by default. */
  name?: string;
  /**
   * The collections an internal link may point to (SPEC §7.5: page, category, collection, product,
   * post). `CATALOG_COLLECTIONS` since T61; T65 adds `pages` (once it has its route), T66 `posts`.
   * Without any, the field offers a custom URL only.
   */
  relationTo?: CollectionSlug[];
  /** The looks a block offers; none hides the choice. */
  appearances?: LinkAppearance[];
  /** Whether a label is asked for (a menu item needs one; a card's whole-surface link may not). */
  label?: boolean;
  required?: boolean;
};

/** The id a relationship value names, populated or not. */
const idOf = (value: unknown): number | string | undefined =>
  typeof value === "number" || typeof value === "string"
    ? value
    : value !== null && typeof value === "object" && "id" in value
      ? ((value as { id?: number | string }).id ?? undefined)
      : undefined;

/**
 * The Medusa pickers (D85): a document Medusa deleted stays in Payload (D75's soft delete) but is not
 * offered, since its page is gone. `resolveLink` leaves out a link that already points at one.
 *
 * Payload also applies `filterOptions` when it validates a save (PR 94 review, item 1), so the
 * document the link holds is let through even when Medusa deleted it: otherwise a header that
 * linked to a product Medusa then deleted could not be published again, for any change, until an
 * editor found and replaced that link. The picker shows it too, as the current choice.
 */
export const hideDeletedInMedusa: Extract<FilterOptions, (...args: never[]) => unknown> = ({
  relationTo,
  siblingData,
}) => {
  if (!(CATALOG_COLLECTIONS as readonly string[]).includes(relationTo)) return true;
  const shown = { deletedInMedusa: { not_equals: true } };
  const held = (siblingData as { reference?: { relationTo?: unknown; value?: unknown } } | null)
    ?.reference;
  const id = held?.relationTo === relationTo ? idOf(held.value) : undefined;
  return id === undefined ? shown : { or: [shown, { id: { equals: id } }] };
};

/**
 * `hideDeletedInMedusa` for a relationship to one catalog collection outside a `link` (T64's
 * sources and pickers): the documents Medusa deleted are not offered, and those the field `name`
 * already holds (one, or a list for `hasMany`) are let through, for the same reason as there.
 */
export function hideDeletedExceptHeld(
  name: string,
): Extract<FilterOptions, (...args: never[]) => unknown> {
  return ({ siblingData }) => {
    const shown = { deletedInMedusa: { not_equals: true } };
    const held = (siblingData as Record<string, unknown> | null)?.[name];
    const ids = (Array.isArray(held) ? held : [held]).flatMap((value) => idOf(value) ?? []);
    return ids.length === 0 ? shown : { or: [shown, { id: { in: ids } }] };
  };
}

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
            filterOptions: hideDeletedInMedusa,
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
      // refused here, and again by `resolveLink`. Payload's own `text` check runs first: a custom
      // `validate` replaces it, and it is where `required` is enforced. Hidden by the condition
      // (a reference link), the field is not validated at all (Payload 3.92.1's `beforeChange`).
      validate: ((value, args) => {
        const base = text(value, args);
        if (base !== true) return base;
        return value == null || value === "" || isSafeLinkUrl(value)
          ? true
          : "Use a path starting with /, or an https, mailto or tel link.";
      }) satisfies TextFieldSingleValidation,
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
