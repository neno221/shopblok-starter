// D66 (T48): the header's search. SearchOverlay asks at every change of its field; this waits
// 250 ms after the last one, aborts the question on its way, and asks `/next/search` (T50's
// handler) for the market. Until T50 the handler is missing, and a 404, like any answer that is not
// a result, is "no results" for that query, so the overlay says so instead of spinning; a request
// the network refused is the same. The recent queries are the browser's (`recent-searches.ts`).
// Enter with nothing highlighted submits the overlay's GET form to `{m}/search`, with or without
// this island.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { SearchResult } from "@shopblok/registry/contracts";
import { SearchOverlay } from "@shopblok/ui/organisms/search-overlay";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  subscribeRecentSearches,
} from "../../lib/visitor/recent-searches";

/** Where the island asks (T50 answers it). */
export const SEARCH_ROUTE = "/next/search";
/** How long the island waits after the last key, in milliseconds. */
export const SEARCH_DELAY = 250;

export type SearchOverlayIslandProps = {
  /** The market's key, which the handler needs (route handlers have no root params). */
  market: string;
  /** The search page the overlay's form GETs, `{m}/search`. */
  action: string;
  copy: Messages["organisms"]["searchOverlay"];
  priceCopy: Messages["molecules"]["priceBlock"];
  locale: string;
  prefetch?: boolean | null;
  fetcher?: typeof fetch;
};

const nothingFor = (query: string): SearchResult => ({
  query,
  total: 0,
  products: [],
  categories: [],
  suggestions: [],
});

function isResult(body: unknown): body is SearchResult {
  if (typeof body !== "object" || body === null) return false;
  const { query, total, products, categories, suggestions } = body as Record<string, unknown>;
  return (
    typeof query === "string" &&
    typeof total === "number" &&
    Array.isArray(products) &&
    Array.isArray(categories) &&
    Array.isArray(suggestions)
  );
}

export function SearchOverlayIsland({
  market,
  action,
  copy,
  priceCopy,
  locale,
  prefetch,
  fetcher,
}: SearchOverlayIslandProps) {
  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getServerRecentSearches,
  );
  const [result, setResult] = useState<SearchResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; abort: AbortController }>(
    undefined,
  );

  function ask(query: string) {
    if (pending.current !== undefined) {
      clearTimeout(pending.current.timer);
      pending.current.abort.abort();
      pending.current = undefined;
    }
    const text = query.trim();
    if (text === "") {
      setResult(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const url = `${SEARCH_ROUTE}?${new URLSearchParams({ market, q: text })}`;
      (fetcher ?? fetch)(url, { signal: abort.signal, credentials: "same-origin" })
        .then(async (response) => {
          const body: unknown = response.ok ? await response.json() : undefined;
          return isResult(body) ? { ...body, query } : nothingFor(query);
        })
        .catch((error: unknown) => {
          if (abort.signal.aborted) throw error;
          return nothingFor(query);
        })
        .then(
          (answer) => {
            setResult(answer);
            setLoading(false);
          },
          () => undefined,
        );
    }, SEARCH_DELAY);
    pending.current = { timer, abort };
  }

  return (
    <SearchOverlay
      search={{ action, query: "" }}
      recent={[...recent]}
      result={result}
      loading={loading}
      copy={copy}
      priceCopy={priceCopy}
      locale={locale}
      prefetch={prefetch}
      onQueryChange={ask}
      onClearRecent={recent.length === 0 ? undefined : clearRecentSearches}
    />
  );
}
