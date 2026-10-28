import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether `given` is `secret` (the preview or the cron secret), compared in constant time (D74).
 * Both sides are hashed first, so the comparison takes as long whatever the lengths. An unset or
 * empty secret matches nothing: preview and the jobs endpoint's secret stay off until it is set
 * (doctor says so).
 */
export function secretMatches(
  given: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || typeof given !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(secret));
}
