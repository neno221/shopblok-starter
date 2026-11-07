/**
 * A relationship's or an upload's value as its id: the id itself, or a populated document's `id`
 * (PR 122 review, item 8: one helper for the blocks, the SEO plugin and the sync). An empty or
 * missing id is `undefined`.
 */
export const idOf = (value: unknown): number | string | undefined => {
  const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof id === "number" || (typeof id === "string" && id !== "") ? id : undefined;
};
