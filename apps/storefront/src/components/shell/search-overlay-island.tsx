// D66 (T48): the header's search. SearchOverlay asks at every change of its field; this waits
// 250 ms after the last one, aborts the question on its way, and asks `/next/search` (T50's
// handler, `lib/listing/handlers.ts`) for the market. An answer that is not a result (a 503 while
// Medusa is down) is "no results" for that query, so the overlay says so instead of spinning; a
// request the network refused is the same. The recent queries are the browser's (`recent-searches.ts`).
// Enter with nothing highlighted submits the overlay's GET form to `{m}/search`, with or without
// this island.
// T113 (D150): the island draws SearchOverlay's frame (the button and the dialog) and fetches the
// dialog's content, `SearchOverlayPanel` (Base UI's Autocomplete and the results: 15.4 KB gzipped
// off every first load, a 16.1 KB chunk of its own), when the visitor reaches for the button (the
// pointer over it, a press, the focus), so it is in no first load (`first-load.ts`' `keptOut`
// checks it). The frame opens the dialog once the panel is in; a failed fetch is asked again at
// the next reach.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { SearchResult } from "@shopblok/registry/contracts";
import { SearchOverlayFrame } from "@shopblok/ui/organisms/search-overlay-frame";
import type { SearchOverlayPanelProps } from "@shopblok/ui/organisms/search-overlay-panel";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  subscribeRecentSearches,
} from "../../lib/visitor/recent-searches";

/** Where the island asks. */
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

type Panel = ComponentType<SearchOverlayPanelProps>;

/** The panel once fetched, so a header drawn again (another page) has it at once. */
let loadedPanel: Panel | undefined;
let panelOnItsWay: Promise<Panel> | undefined;

/** Fetches the panel's module once; a failed fetch is forgotten, so the next reach asks again. */
export function loadSearchPanel(): Promise<Panel> {
  panelOnItsWay ??= import("@shopblok/ui/organisms/search-overlay-panel").then(
    (module) => (loadedPanel = module.SearchOverlayPanel),
    (error: unknown) => {
      panelOnItsWay = undefined;
      throw error;
    },
  );
  return panelOnItsWay;
}

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
  const [panel, setPanel] = useState<Panel | undefined>(() => loadedPanel);
  const [result, setResult] = useState<SearchResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; abort: AbortController }>(
    undefined,
  );

  // Nothing outlives the island: a question on its way when the header goes is dropped (PR 75
  // review, item 5).
  useEffect(
    () => () => {
      if (pending.current === undefined) return;
      clearTimeout(pending.current.timer);
      pending.current.abort.abort();
      pending.current = undefined;
    },
    [],
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
    <SearchOverlayFrame
      panel={panel}
      // The frame is given the fetch, so a press that waited for a fetch that failed is forgotten
      // (PR 157 review, item 5).
      onWantPanel={() =>
        loadSearchPanel().then((loaded) => {
          setPanel(() => loaded);
        })
      }
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
