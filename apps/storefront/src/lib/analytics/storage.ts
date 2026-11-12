// M6 D123 (T97): PostHog's leftovers in the browser, removed when analytics consent is withdrawn
// (`loader.ts`, after PostHog's own opt-out) and whenever a page finds no consent but some of
// PostHog's storage (a withdrawal in another tab; `gate.ts`). Its names start with `ph_` (the
// cookie, `ph_<key>_posthog`, and local storage) or `__ph` (the opt-in flag, the session's window).

const isPosthogs = (name: string) => name.startsWith("ph_") || name.startsWith("__ph");

/** Whether the browser holds any cookie or storage entry of PostHog's. */
export function hasPosthogStorage(): boolean {
  const cookies = document.cookie.split(";").map((part) => part.split("=")[0]?.trim() ?? "");
  return (
    cookies.some(isPosthogs) ||
    [window.localStorage, window.sessionStorage].some((storage) =>
      Object.keys(storage).some(isPosthogs),
    )
  );
}

/** Removes every cookie and storage entry of PostHog's (`ph_…`, `__ph…`) left in the browser. */
export function clearPosthogStorage(): void {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim() ?? "";
    if (!isPosthogs(name)) continue;
    const expired = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = expired;
    // A cookie PostHog set for the site's parent domain (`cross_subdomain_cookie`).
    const parts = window.location.hostname.split(".");
    for (let index = 0; index < parts.length - 1; index += 1) {
      document.cookie = `${expired}; Domain=.${parts.slice(index).join(".")}`;
    }
  }
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) if (isPosthogs(key)) storage.removeItem(key);
  }
}
