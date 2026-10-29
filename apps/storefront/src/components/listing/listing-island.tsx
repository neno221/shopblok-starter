// D59 (T50): what a listing page does with the visitor's filters and sort. The page's server part
// draws the first page with no filter (in the static shell); this reads the URL's query
// (`useSearchParams`, so it sits in a `Suspense` with no fallback) and, only when the query changes
// the results (a filter, a sort or a page), asks `/next/listing` for them and draws them before the
// server's, which its root (`peer`, `data-active`) then hides by CSS. A clean URL fetches nothing,
// so the server's first page and the island never disagree; a URL that changes the results never
// shows the server's (PR 78 review, item 1): while the first answer loads it says so, and an answer
// that is not results says what went wrong (no such page: "no match" with the way back to the
// listing; Medusa down or no network: "could not be loaded" with "Try again"). The filter and sort forms GET the
// search page without scripts; with them, their `submit` is caught here and becomes the listing's
// own URL (`history.pushState`, which Next keeps `useSearchParams` in step with). The new count is
// announced (WCAG 4.1.3), and more than two facets add `noindex,follow` (`robots-meta.tsx`).
"use client";

import { formatMessage } from "@shopblok/i18n";
import type { ListingResults as ListingResultsContent } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { ListingResults, type ListingResultsCopy } from "@shopblok/ui/templates/listing-results";
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
  /** The listing's own words (`templates.productListing`); `found` is ICU with `{count}`. */
  announce: {
    found: string;
    loading: string;
    noMatch: { title: string; text: string; clear: string };
    failed: { title: string; text: string; retry: string };
  };
  locale: string;
  prefetch?: boolean | null;
  fetcher?: typeof fetch;
};

/** What `/next/listing` gave for a URL: results, no such page (404), or no answer at all. */
type Answer =
  | { key: string; kind: "results"; results: ListingResultsContent }
  | { key: string; kind: "missing" | "failed" };

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

  // The last answer and the URL it was for; `attempt` asks again for the same URL ("Try again").
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);

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
      .then(async (response): Promise<Answer> => {
        if (response.status === 404 || response.status === 400) return { key, kind: "missing" };
        const body: unknown = response.ok ? await response.json() : undefined;
        return isResults(body) ? { key, kind: "results", results: body } : { key, kind: "failed" };
      })
      .catch((): Answer => ({ key, kind: "failed" }))
      .then((next) => {
        if (!abort.signal.aborted) setAnswer(next);
      });
    return () => abort.abort();
    // `key` stands for `chosen` and `page`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, market, scope, fetcher]);

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

  const current = answer !== null && answer.key === key ? answer : null;
  const loading = active && current === null;
  // While the next results load, the last ones stay.
  const results =
    current?.kind === "results"
      ? current.results
      : loading && answer?.kind === "results"
        ? answer.results
        : undefined;
  const hrefFor = (n: number) =>
    withQuery(
      base,
      new URLSearchParams([...chosen.entries(), ...(n === 1 ? [] : [["page", String(n)]])]),
    );

  const status = loading
    ? announce.loading
    : current?.kind === "results"
      ? formatMessage(announce.found, { count: current.results.toolbar.count }, locale)
      : current?.kind === "missing"
        ? announce.noMatch.title
        : current?.kind === "failed"
          ? announce.failed.title
          : "";

  return (
    <div
      data-slot="listing-island"
      className="peer"
      data-active={active ? "" : undefined}
      aria-busy={loading || undefined}
    >
      {active ? <RobotsMeta filters={query.filters} /> : null}
      <p role="status" className="sr-only">
        {status}
      </p>
      {!active ? null : results !== undefined ? (
        <ListingResults
          {...results}
          copy={copy}
          locale={locale}
          hrefFor={hrefFor}
          prefetch={prefetch}
        />
      ) : current?.kind === "missing" ? (
        <EmptyState
          data-slot="listing-island-missing"
          title={announce.noMatch.title}
          text={announce.noMatch.text}
          action={{ label: announce.noMatch.clear, href: base }}
          prefetch={prefetch}
        />
      ) : current?.kind === "failed" ? (
        <div data-slot="listing-island-failed" className="flex flex-col items-center gap-4">
          <EmptyState title={announce.failed.title} text={announce.failed.text} />
          <Button type="button" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {announce.failed.retry}
          </Button>
        </div>
      ) : (
        <p
          data-slot="listing-island-loading"
          aria-hidden="true"
          className="py-12 text-center text-muted-foreground"
        >
          {announce.loading}
        </p>
      )}
    </div>
  );
}
