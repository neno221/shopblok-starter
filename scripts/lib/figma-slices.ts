// Joining the slices of the Figma export (M1 plan, T18; D25). `use_figma` answers at most 20 KB, so
// scripts/figma/export-variables.js returns one slice of its JSON text per run, with the whole
// text's length and FNV-1a hash. Pure: no file is touched here. The plugin code keeps its own copy
// of `fnv1a`, because code run through `use_figma` can't import; the test pins the two together.

export type Slice = {
  offset: number;
  length: number;
  fnv1a: string;
  chunk: string;
};

/** FNV-1a (32-bit) over UTF-16 code units, as 8 hex digits. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Joins slices in any order, from runs with any PAGE_SIZE, as long as they cover the text with no
 * gap and all come from the same export. The result must have the reported length and hash, so a
 * slice copied wrongly fails here rather than reaching the repo.
 */
export function joinSlices(slices: readonly Slice[]): string {
  if (slices.length === 0) throw new Error("no slices to join");
  const sorted = [...slices].sort((a, b) => a.offset - b.offset);
  const { length, fnv1a: hash } = sorted[0]!;
  let text = "";
  for (const s of sorted) {
    if (s.length !== length || s.fnv1a !== hash) {
      throw new Error(
        `the slice at ${s.offset} comes from a different export (${s.fnv1a})`,
      );
    }
    if (s.offset > text.length)
      throw new Error(`gap before offset ${s.offset}`);
    text =
      text.slice(0, s.offset) + s.chunk + text.slice(s.offset + s.chunk.length);
  }
  if (text.length !== length)
    throw new Error(`joined ${text.length} of ${length} characters`);
  if (fnv1a(text) !== hash)
    throw new Error(
      `the joined text's FNV-1a hash is ${fnv1a(text)}, not ${hash}`,
    );
  return text;
}
