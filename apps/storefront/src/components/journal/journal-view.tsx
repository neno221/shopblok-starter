import { formatMessage } from "@shopblok/i18n";
import { JournalTemplate, journalCopy } from "@shopblok/ui/templates/journal";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { journalPath } from "../../lib/cms/paths";
import { journalContent } from "../../lib/cms/post-content";
import { readPostList } from "../../lib/cms/posts";
import { getCurrentMarket } from "../../lib/current-market";
import { listingPageSize } from "../../lib/listing/listing";
import { hreflangAlternates } from "../../lib/markets/hreflang";
import { journalJsonLd } from "../../lib/seo/post";
import { jsonLdText } from "../../lib/seo/product";
import { SHELL_PREFETCH } from "../../lib/site";
import { getShellData } from "../shell/shell-data";

// D80, D59 (T66): the journal's one server part. `{m}/journal` and `{m}/journal/page/[n]` render
// this with the page from the path, under `ensureStatic = "navigation"`: the posts of one page,
// newest first, from `cmsRead`'s cached reads (`posts:<locale>`), so every page is in the static
// shell, self-canonical and crawlable. A page past the last, and every page without a database
// (D10's stand-in), is `notFound()`, called before anything renders. As many posts a page as the
// listings show products (`STOREFRONT_LISTING_PAGE_SIZE`, 24 by default).

/** The journal's `page` for the market, or `null` for a 404. Shared by the page and its metadata. */
const readJournal = cache(async (page: number | null, draft: boolean) => {
  if (page === null) return null;
  const market = await getCurrentMarket();
  const list = await readPostList({ market, draft }, page, listingPageSize());
  if (list === null) return null;
  const [{ url, map }, messages] = await Promise.all([getShellData(), getMessages()]);
  const journal = journalContent(list, page, {
    title: messages.templates.journal.title,
    home: messages.templates.productDetail.home,
    url,
  });
  return journal === null ? null : { market, map, url, messages, journal, page };
});

export async function journalMetadata(page: number | null): Promise<Metadata> {
  const { isEnabled: draft } = await draftMode();
  const data = await readJournal(page, draft);
  if (data === null) return {};
  const { map, url, messages, journal, market } = data;
  const path = journalPath(data.page);
  const title =
    data.page === 1
      ? journal.title
      : `${journal.title}, ${formatMessage(
          messages.molecules.pagination.page,
          { page: data.page },
          market.htmlLang,
        )}`;
  return {
    title,
    alternates: {
      // SPEC §12: the journal's pages are self-canonical, each at its own path in every market.
      canonical: url(path),
      languages: hreflangAlternates(path, map),
    },
    openGraph: { type: "website", title, url: url(path) },
  };
}

export async function JournalView({ page }: { page: number | null }) {
  const { isEnabled: draft } = await draftMode();
  const data = await readJournal(page, draft);
  if (data === null) notFound();
  const { market, url, messages, journal } = data;
  return (
    <>
      <script
        type="application/ld+json"
        // The editors' titles, escaped by `jsonLdText` so they cannot close the element.
        dangerouslySetInnerHTML={{
          __html: jsonLdText(
            journalJsonLd({
              journal,
              href: url(journalPath(data.page)),
              language: market.htmlLang,
            }),
          ),
        }}
      />
      <JournalTemplate
        {...journal}
        copy={journalCopy(messages)}
        locale={market.htmlLang}
        timeZone={market.timeZone}
        hrefFor={(n) => url(journalPath(n))}
        prefetch={SHELL_PREFETCH}
      />
    </>
  );
}
