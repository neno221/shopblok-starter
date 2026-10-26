// The visitor's recent searches (D66: SearchOverlay's recent queries from `localStorage`), as a
// store `useSyncExternalStore` reads, the way the visitor store is read (D44): the server snapshot
// is empty, so a prerendered header holds no visitor's queries, and the browser's arrive after
// hydration. The search page (T50) records a query with `rememberSearch`; the overlay's "Clear
// recent searches" calls `clearRecentSearches`. Storage that throws (a private window, a full
// quota) leaves the list empty: recent queries are a convenience, never a reason to fail.

const KEY = "shopblok:recent-searches";
/** SearchOverlay's contract takes eight at most. */
export const MAX_RECENT = 8;

const EMPTY: readonly string[] = Object.freeze([]);
let snapshot: readonly string[] | undefined;
const listeners = new Set<() => void>();

function read(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter((entry): entry is string => typeof entry === "string" && entry !== "")
          .slice(0, MAX_RECENT)
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: readonly string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this page only.
  }
  snapshot = next;
  for (const listener of [...listeners]) listener();
}

export function subscribeRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentSearches(): readonly string[] {
  snapshot ??= read();
  return snapshot;
}

export function getServerRecentSearches(): readonly string[] {
  return EMPTY;
}

/** Puts `query` first, once, and keeps the newest eight. */
export function rememberSearch(query: string): void {
  const text = query.trim();
  if (text === "") return;
  const rest = getRecentSearches().filter((entry) => entry !== text);
  write([text, ...rest].slice(0, MAX_RECENT));
}

export function clearRecentSearches(): void {
  write(EMPTY);
}

/** Forgets what this module read (a test, which changes storage under it). */
export function resetRecentSearches(): void {
  snapshot = undefined;
}
