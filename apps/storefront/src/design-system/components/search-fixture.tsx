"use client";

// Ours (T37, SETUP.md "Listing organisms (T37)"; D44). The design system's stand-in for M3's search:
// it holds what the connected search will hold, so SearchOverlay's live render can be used, not only
// looked at. It answers `onQueryChange` after a short wait (250 ms, the debounce M3's request will
// have, with `loading` true meanwhile) with the locale's products whose title contains the query,
// ignoring case and accents, and it keeps the recent queries, which "Clear recent searches" empties.
// It draws nothing of its own. The sample products, the recent queries and the words arrive as
// props: this file imports no fixtures and no catalog, so none of that data is a client chunk of its
// own (the page already sends the props to the client part once, as plain data).
// Decisions that are not obvious:
// - A new question replaces the one on its way, so the answer to "ho" never lands after the answer
//   to "hoo" (M3's request will be aborted the same way, with the same effect for the reader).
// - An empty query asks nothing and clears the answer, so the overlay goes back to the recent
//   queries at once; it does not wait for a timer that would only say "no results".
// - The match is a plain "contains" on the title, after both sides are lowered in the market's
//   language and stripped of accents (`normalize("NFD")` and the combining marks), and the Greek
//   final sigma is written as the other sigma on both sides, so "οσ" finds "ος". The answer's
//   `total` is every match; `products` are the first six, as the overlay shows no more.
// - The queries a visitor submits to the search page are not added to the recent ones: the page does
//   not exist before M3, and the list's only change is the clearing.
import type { Messages } from "@shopblok/i18n";
import type { ProductCard, SearchResult } from "@shopblok/registry/contracts";
import { SearchOverlay } from "@shopblok/ui/organisms/search-overlay";
import { useEffect, useRef, useState } from "react";

/** How long the fixture waits after a key, in milliseconds: M3's debounce, so `loading` is seen. */
const DELAY = 250;
/** How many products the overlay shows of the matches. */
const SHOWN = 6;

type SearchFixtureProps = {
  /** The page the form GETs (`listing.search.idle.search.action`). */
  action: string;
  /** The recent queries to start with (`listing.search.idle.recent`). */
  recent: string[];
  /** The products the fixture searches: the locale's cards. */
  products: ProductCard[];
  /** The wording, from the catalog's `organisms.searchOverlay`. */
  copy: Messages["organisms"]["searchOverlay"];
  /** The words around a price, from `molecules.priceBlock`. */
  priceCopy: Messages["molecules"]["priceBlock"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  prefetch?: boolean | null;
  /** How long to wait before answering, in milliseconds. Default 250. */
  delay?: number;
  /** Drawn open at first render (the design system's states, in a box). */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  /** Classes for the overlay's popup (the states cap it to their box and stop its animation). */
  popupClassName?: string;
};

/** Lower case, no accents, one sigma: what two spellings of a word share. */
function plain(text: string, locale: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase(locale)
    .replaceAll("ς", "σ");
}

/** The answer M3's search will give: the products whose title has the query in it. */
function answer(query: string, products: ProductCard[], locale: string): SearchResult {
  const wanted = plain(query.trim(), locale);
  const matches = products.filter((product) => plain(product.title, locale).includes(wanted));
  return {
    query,
    total: matches.length,
    products: matches.slice(0, SHOWN),
    categories: [],
    suggestions: [],
  };
}

function SearchFixture({
  action,
  recent: startingRecent,
  products,
  copy,
  priceCopy,
  locale,
  prefetch,
  delay = DELAY,
  defaultOpen,
  modal,
  popupClassName,
}: SearchFixtureProps) {
  const [recent, setRecent] = useState(startingRecent);
  const [result, setResult] = useState<SearchResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  // A timer left running would answer a page that has gone.
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function ask(query: string) {
    stop();
    if (query.trim() === "") {
      setLoading(false);
      setResult(undefined);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setResult(answer(query, products, locale));
      setLoading(false);
    }, delay);
  }

  return (
    <SearchOverlay
      search={{ action, query: "" }}
      recent={recent}
      result={result}
      loading={loading}
      copy={copy}
      priceCopy={priceCopy}
      locale={locale}
      prefetch={prefetch}
      onQueryChange={ask}
      onClearRecent={() => setRecent([])}
      defaultOpen={defaultOpen}
      modal={modal}
      popupClassName={popupClassName}
    />
  );
}

export { SearchFixture };
export type { SearchFixtureProps };
