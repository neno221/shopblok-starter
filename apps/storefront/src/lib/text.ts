/** A text an editor may leave blank: blank (or not a string) as missing, anything else as written. */
export const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;
