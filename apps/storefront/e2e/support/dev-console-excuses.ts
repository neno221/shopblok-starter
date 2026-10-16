import type { Message } from "./console";

// What `dev-console.spec.ts` excuses, and nothing else (T25, plan step 2). A message is excused
// when its route, its type and its exact text all match; a pattern, a prefix or "any route" is not
// an excuse. Each entry says why, and links the upstream issue if one exists (a session cannot file
// one; M0's follow-up F3 says who can). SETUP.md, "The storefront in next dev (T25)", lists the
// same entries with the run that observed them.

/** One message of `next dev` that is excused: its route, its type and its exact text. */
export type DevExcuse = { path: string; type: string; text: string; why: string };

/** Next's or React's dev-only validation that the storefront does not cause. Empty: none was observed. */
export const devExcuses: DevExcuse[] = [];

/** The text Chromium logs for a response with status 404, whatever the resource. */
export const NOT_FOUND_TEXT =
  "Failed to load resource: the server responded with a status of 404 (Not Found)";

/**
 * A route that is a 404 on purpose (`/el-cy`, `/nope/nope`) makes Chromium log its own document
 * once: "Failed to load resource … 404", with the page's URL as the source. That is the route
 * doing its job, so it is excused for a route expected to answer 404 and for no other URL.
 */
export function isOwnNotFound(
  message: Message,
  route: { path: string; status: number },
  baseURL: string,
): boolean {
  return (
    route.status === 404 &&
    message.type === "error" &&
    message.text === NOT_FOUND_TEXT &&
    message.source === new URL(route.path, baseURL).href
  );
}

export function excusedInDev(path: string, message: Message): boolean {
  return devExcuses.some(
    (e) => e.path === path && e.type === message.type && e.text === message.text,
  );
}
