import { isDeepStrictEqual } from "node:util";

/**
 * One seeded value: what the seed writes now, and what earlier seeds wrote (`before`, newest last).
 * A release that changes a seeded text moves the old text into `before`, so a shop that still holds
 * it gets the new one, and a shop whose editor changed it keeps the editor's.
 */
export type Seeded<T = unknown> = { value: T; before?: readonly T[] };

const isEmpty = (value: unknown) => value === undefined || value === null || value === "";

/**
 * The seed's rule (T59 step 8): fill an empty field, and replace a value only while it is one the
 * seed itself wrote. Anything else is an editor's, and stays. `null` means "leave it".
 */
export function seededUpdate<T>(current: unknown, seeded: Seeded<T>): T | null {
  if (isDeepStrictEqual(current, seeded.value)) return null;
  if (isEmpty(current)) return seeded.value;
  return (seeded.before ?? []).some((old) => isDeepStrictEqual(current, old)) ? seeded.value : null;
}
