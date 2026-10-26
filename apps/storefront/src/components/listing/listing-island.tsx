// D59 (T50): what a listing page does with the visitor's filters and sort. The page's server part
// draws the first page with no filter (in the static shell); this reads the URL's query
// (`useSearchParams`, so it sits in a `Suspense` with no fallback) and, only when the query changes
// the results (a filter, a sort or a page), asks `/next/listing` for them and draws them before the
// server's, which its root (`peer`, `data-active`) then hides by CSS. A clean URL fetches nothing,
// so the server's first page and the island never disagree. The filter and sort forms GET the
// search page without scripts; with them, their `submit` is caught here and becomes the listing's
// own URL (`history.pushState`, which Next keeps `useSearchParams` in step with). The new count is
// announced (WCAG 4.1.3), and more than two facets add `noindex,follow` (`robots-meta.tsx`).
"use client";

import { formatMessage } from "@shopblok/i18n";
import type { ListingResults as ListingResultsContent } from "@shopblok/registry/contracts";
import { ListingResults, type ListingResultsCopy } from "@shopblok/ui/templates/product-listing";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  changesListing,
  filterParams,
  parseListingQuery,
  withQuery,
} from "../../lib/listing/query";
import { RobotsMeta } from "./robots-meta";

/** Where the island asks. */
export const LISTING_ROUTE = "/next/listing";

export type ListingIslandProps = {
  /** The market's key, which the handler needs (route handlers have no root params). */
  market: string;
  /** The listing, as the forms' hidden `scope` names it (`category:apparel`). */
  scope: string;
  /** The listing's first page, its public URL. */
  base: string;
  /** The page the path names (`/page/2`), used while the query names none. */
  pathPage: number;
  /** The search page, where the filter and sort forms GET without scripts. */
  action: string;
  copy: ListingResultsCopy;
  /** `found` is ICU with `{count}`. */
  announce: { found: string; loading: string };
  locale: string;
  prefetch?: boolean | null;
  fetcher?: typeof fetch;
};

type Answer = { key: string; results: ListingResultsContent | null };

function isResults(body: unknown): body is ListingResultsContent {
  if (typeof body !== "object" || body === null) return false;
  const { toolbar, grid, page } = body as Record<string, unknown>;
  return (
    typeof toolbar === "object" &&
    toolbar !== null &&
    typeof (toolbar as { count?: unknown }).count === "number" &&
    typeof grid === "object" &&
    grid !== null &&
    Array.isArray((grid as { products?: unknown }).products) &&
    typeof page === "object" &&
    page !== null
  );
}

/** The same address, wherever `href` is written: a path or a whole URL. */
const sameAddress = (a: string, b: string) =>
  new URL(a, window.location.href).href === new URL(b, window.location.href).href;

/** A submitted form's fields as the listing's query: no scope, no empty field. */
function formQuery(form: HTMLFormElement, submitter: HTMLElement | null): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form, submitter)) {
    if (typeof value === "string" && name !== "scope" && value !== "") params.append(name, value);
  }
  return filterParams(params);
}

export function ListingIsland({
  market,
  scope,
  base,
  pathPage,
  action,
  copy,
  announce,
  locale,
  prefetch,
  fetcher,
}: ListingIslandProps) {
  const router = useRouter();
  const search = useSearchParams();
  const query = parseListingQuery(new URLSearchParams(search.toString()));
  const active = changesListing(query);
  const chosen = filterParams(new URLSearchParams(search.toString()));
  const page = query.page ?? pathPage;
  const key = active ? `${chosen.toString()}#${page}` : "";

  // The last answer and the URL it was for; `null` results for an answer that is none (a page past
  // the last, Medusa down), which leaves the server's.
  const [answer, setAnswer] = useState<Answer>({ key: "", results: null });

  useEffect(() => {
    if (key === "") return;
    const abort = new AbortController();
    const params = new URLSearchParams([
      ["market", market],
      ["scope", scope],
      ["page", String(page)],
      ...chosen.entries(),
    ]);
    (fetcher ?? fetch)(`${LISTING_ROUTE}?${params}`, { signal: abort.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as unknown) : undefined))
      .catch(() => undefined)
      .then((body) => {
        if (!abort.signal.aborted) setAnswer({ key, results: isResults(body) ? body : null });
      });
    return () => abort.abort();
    // `key` stands for `chosen` and `page`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, market, scope, fetcher]);

  // The listing's forms land here instead of on the search page: the filters reset the page.
  useEffect(() => {
    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
      if (form.method.toLowerCase() !== "get" || !sameAddress(form.action, action)) return;
      if (new FormData(form).get("scope") !== scope) return;
      event.preventDefault();
      const target = withQuery(base, formQuery(form, event.submitter));
      if (new URL(target, window.location.href).pathname === window.location.pathname)
        window.history.pushState(null, "", target);
      else router.push(target as Route, { scroll: false });
    }
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, [action, base, scope, router]);

  const loading = active && answer.key !== key;
  // While the next results load, the last ones stay; the first ones wait on the server's.
  const results = active ? (answer.results ?? undefined) : undefined;
  const hrefFor = (n: number) =>
    withQuery(
      base,
      new URLSearchParams([...chosen.entries(), ...(n === 1 ? [] : [["page", String(n)]])]),
    );

  return (
    <div
      data-slot="listing-island"
      className="peer"
      data-active={results === undefined ? undefined : ""}
      aria-busy={loading || undefined}
    >
      {active ? <RobotsMeta filters={query.filters} /> : null}
      <p role="status" className="sr-only">
        {loading
          ? announce.loading
          : results === undefined
            ? ""
            : formatMessage(announce.found, { count: results.toolbar.count }, locale)}
      </p>
      {results === undefined ? null : (
        <ListingResults
          {...results}
          copy={copy}
          locale={locale}
          hrefFor={hrefFor}
          prefetch={prefetch}
        />
      )}
    </div>
  );
}
