import type { TextField } from "payload";

/**
 * Which seeded document this is (T59's seed runner): the seed finds its documents by this key, so
 * an editor may rename or re-slug them freely. Hidden, written only by the seed (which runs with
 * `overrideAccess`), and cleared on a duplicate, so a copy is the editor's own document.
 */
export function seedKey(): TextField {
  return {
    name: "seedKey",
    type: "text",
    unique: true,
    index: true,
    admin: { hidden: true },
    access: { create: () => false, update: () => false },
    hooks: { beforeDuplicate: [() => null] },
  };
}
