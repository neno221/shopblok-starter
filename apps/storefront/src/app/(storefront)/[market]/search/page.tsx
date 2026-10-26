import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n";
import { SearchResultsTemplate, searchResultsCopy } from "@shopblok/ui/templates/search-results";
import { SearchField } from "@shopblok/ui/molecules/search-field";
import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { RememberSearch } from "../../../../components/listing/remember-search";
import { getShellData } from "../../../../components/shell/shell-data";
import { getCurrentMarket } from "../../../../lib/current-market";
import {
  listingPageSize,
  readListing,
  resolveScope,
  scopeField,
} from "../../../../lib/listing/listing";
import { filterParams, parseListingQuery, withQuery } from "../../../../lib/listing/query";
import { getMarketContext } from "../../../../lib/market-context";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D59, D63 (T50): the search page. It is the one listing page drawn for each request: the query,
// the filters and the sort are all in its URL (`searchParams`, read inside the `Suspense`, so the
// shell around it stays static), and it is where a listing's filter and sort forms land without
// JavaScript, with the listing in `scope`. Every result is `noindex`; the metadata reads nothing
// from the URL, so it is static.

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    title: messages.templates.searchResults.title,
    robots: { index: false, follow: true },
  };
}

function toParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(raw))
    for (const each of Array.isArray(value) ? value : value === undefined ? [] : [value])
      params.append(name, each);
  return params;
}

export default async function SearchPage({ searchParams }: Props) {
  // The shell's map, not the market's context: the static part reads no region, so a build
  // without Medusa (the stand-in, D10) renders it too.
  const [{ url }, messages] = await Promise.all([getShellData(), getMessages()]);
  return (
    <Suspense fallback={<SearchFallback messages={messages} action={url("/search")} />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

/** Until the results stream in: the field and the heading, where the page will have them. */
function SearchFallback({ messages, action }: { messages: Messages; action: string }) {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-4 py-6 md:px-6 md:py-8 lg:px-8"
    >
      <SearchField
        action={action}
        query=""
        copy={messages.molecules.searchField}
        className="max-w-xl"
      />
      <h1 className="text-2xl leading-tight font-semibold md:text-3xl">
        {messages.templates.searchResults.title}
      </h1>
    </main>
  );
}

async function SearchResults({ searchParams }: Props) {
  const params = toParams(await searchParams);
  const [market, messages] = await Promise.all([getCurrentMarket(), getMessages()]);
  const context = await getMarketContext(market.key);
  if (context === null) return null;
  const query = parseListingQuery(params);
  // A filter form from a listing keeps to it; a scope that is not one is the whole store.
  const resolved =
    (query.scope === null ? null : await resolveScope(context, messages, query.scope)) ??
    (await resolveScope(context, messages, { kind: "store" }));
  if (resolved === null) return null;
  const action = context.url("/search");
  const own = new URLSearchParams([
    ...(query.query === "" ? [] : [["q", query.query]]),
    ...(query.scope === null ? [] : [["scope", scopeField(resolved.scope).value]]),
  ]);
  const input = {
    context,
    messages,
    resolved,
    query,
    params,
    pathPage: 1,
    pageSize: listingPageSize(),
    links: {
      base: { path: action, params: own },
      formAction: action,
      hidden: [...own.entries()].map(([name, value]) => ({ name, value })),
    },
  };
  // A page past the last shows the first: the search has no page of its own to 404.
  const results =
    (await readListing(input)) ??
    (await readListing({ ...input, query: { ...query, page: null } }));
  if (results === null) return null;
  const copy = messages.templates.searchResults;
  const title =
    query.query === ""
      ? query.scope === null
        ? copy.title
        : resolved.title
      : formatMessage(copy.resultsFor, { query: query.query }, market.htmlLang);
  const chosen = filterParams(params);
  return (
    <>
      <RememberSearch query={query.query} />
      <SearchResultsTemplate
        variant="default"
        search={{ action, query: query.query }}
        title={title}
        results={results}
        copy={searchResultsCopy(messages)}
        locale={market.htmlLang}
        hrefFor={(n) =>
          withQuery(
            action,
            new URLSearchParams([
              ...own.entries(),
              ...chosen.entries(),
              ...(n === 1 ? [] : [["page", String(n)]]),
            ]),
          )
        }
        prefetch={SHELL_PREFETCH}
      />
    </>
  );
}
