import type { Page } from "@playwright/test";

// The console rules of `payload-admin.spec.ts` (T16, ADR 0001), moved here unchanged by T25 so that
// `dev-console.spec.ts` judges the storefront's own pages by the same rules (T24's DS checks use them
// too). What they say:
//
// - every `error` and `warning` message and every uncaught page error is collected, with the path
//   the page was on and, for a failed resource, its URL (the console says only "Failed to load
//   resource");
// - a failed request to another host than `baseURL`'s is not this server's console (the admin's
//   Gravatar avatar, D18; the cloud's proxy blocks it), and so is a fetch that a navigation
//   cancelled (`ERR_ABORTED`), which is the browser's doing; a request to this server that fails
//   is not excused.

export type Message = { type: string; text: string; page: string; source: string };

export type FailedRequest = { url: string; error: string };

/** A request to another host than `baseURL`'s (the admin's Gravatar avatar, D18) is not this server's console. */
export const localTo = (baseURL: string | undefined) => {
  const own = new URL(baseURL ?? "").hostname;
  return (url: string) => {
    try {
      return new URL(url).hostname === own;
    } catch {
      return true;
    }
  };
};

/** Collects a page's console messages and failed requests into the two arrays. */
export function collectConsole(
  page: Page,
  consoleMessages: Message[],
  failedRequests: FailedRequest[],
): void {
  const where = () => new URL(page.url() || "http://x/").pathname;
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      page: where(),
      // For a failed resource the console says only "Failed to load resource"; this is its URL.
      source: message.location().url,
    });
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({ type: "pageerror", text: error.message, page: where(), source: "" });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "" });
  });
}

/** What the rules judge: the failed requests to this server (not aborted), and the console messages. */
export function judgeConsole(
  consoleMessages: Message[],
  failedRequests: FailedRequest[],
  baseURL: string | undefined,
  excused: (message: Message) => boolean = () => false,
) {
  const isLocal = localTo(baseURL);
  const aborted = failedRequests.filter((r) => r.error === "net::ERR_ABORTED").length;
  const local = failedRequests.filter((r) => isLocal(r.url) && r.error !== "net::ERR_ABORTED");
  const judged = consoleMessages.filter(
    (m) => !(m.source !== "" && !isLocal(m.source) && /^Failed to load resource/.test(m.text)),
  );
  const unexcused = judged.filter((m) => !excused(m));
  return {
    local,
    judged,
    summary: unexcused.map((m) => `${m.type} @ ${m.page}: ${m.text.slice(0, 400)}`),
    failedLine:
      `failed requests: ${failedRequests.length} (this server, not aborted: ${local.length}; aborted: ${aborted}); ` +
      `other hosts: ${[...new Set(failedRequests.filter((r) => !isLocal(r.url)).map((r) => new URL(r.url).hostname))].join(", ") || "none"}`,
  };
}
