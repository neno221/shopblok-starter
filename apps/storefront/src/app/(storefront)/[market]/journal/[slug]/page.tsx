import { PostTemplate, postCopy } from "@shopblok/ui/templates/post";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { RefreshOnSave } from "../../../../../components/cms/refresh-on-save";
import { CmsRichText } from "../../../../../components/cms/rich-text";
import { getShellData } from "../../../../../components/shell/shell-data";
import { journalPath, postPath } from "../../../../../lib/cms/paths";
import { postContent } from "../../../../../lib/cms/post-content";
import { postSlugsIn, readPostBySlug, readPostList } from "../../../../../lib/cms/posts";
import { shellPaths } from "../../../../../lib/cms/shell";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { getMarketMap } from "../../../../../lib/markets/get-market-map";
import { hreflangAlternates } from "../../../../../lib/markets/hreflang";
import { findMarket, listMarkets } from "../../../../../lib/markets/market";
import { PLACEHOLDER_HANDLE, prerenderCap } from "../../../../../lib/prerender";
import { postJsonLd } from "../../../../../lib/seo/post";
import { withSeo } from "../../../../../lib/seo/meta";
import { jsonLdText } from "../../../../../lib/seo/product";
import { siteOrigin } from "../../../../../lib/site-origin";

// D80 (T66): a post at `/journal/<slug>` in the market's language, in the static shell. Every read
// is a `cached()` entry (the posts' slugs and the post under `posts:<locale>`, the shell's), so the
// route is `ensureStatic = "navigation"`: a `searchParams`, a `cookies()` or an uncached read
// anywhere in it fails the build. `notFound()` is called before anything renders, so a slug with no
// published post is the market's own 404. In Draft Mode (live preview, D74) it reads the editor's
// latest version and renders the island that redraws the frame on save.

export const ensureStatic = "navigation";
// W5: no instant-navigation check for a page that reads its path first (SETUP.md, "W5 fixes").
export const instant = false;

type Params = { market: string; slug: string };
type Props = { params: Promise<Params> };

/**
 * D58: the newest published posts' slugs in the market's language (by `publishedAt`, the
 * journal's first page at the PDPs' cap, `STOREFRONT_PRERENDER_PRODUCTS`); the rest render on
 * their first request. With no database (or no post) the build renders one placeholder, which the
 * page answers with a 404 before reading.
 */
export async function generateStaticParams({
  params,
}: {
  params: Pick<Params, "market">;
}): Promise<Pick<Params, "slug">[]> {
  const placeholder = [{ slug: PLACEHOLDER_HANDLE }];
  const cap = prerenderCap();
  const market = findMarket(await getMarketMap(), params.market);
  if (market === undefined || cap === 0) return placeholder;
  const newest = await readPostList({ market, draft: false }, 1, cap);
  const found = (newest?.posts ?? []).map((post) => post.slug);
  return found.length === 0 ? placeholder : found.map((slug) => ({ slug }));
}

/** The post at the slug and its market, or `null` for a 404. Shared by the page and metadata. */
const readPost = cache(async (encoded: string, draft: boolean) => {
  if (encoded === PLACEHOLDER_HANDLE) return null;
  let slug: string;
  try {
    // Next may hand the segment encoded (`%CF%86…`) or not; a slug has no `%` of its own.
    slug = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  const market = await getCurrentMarket();
  const post = await readPostBySlug({ market, draft }, slug);
  if (post === null) return null;
  const [{ url }, messages] = await Promise.all([getShellData(), getMessages()]);
  const content = postContent(post, {
    journal: messages.templates.journal.title,
    home: messages.templates.productDetail.home,
    url,
  });
  return content === null
    ? null
    : { market, post, content, messages, href: url(postPath(slug) ?? journalPath()) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, { isEnabled: draft }] = await Promise.all([params, draftMode()]);
  const data = await readPost(slug, draft);
  if (data === null) return {};
  const { post, content, href } = data;
  const { map, settings } = await getShellData();
  const languages = [...new Set(listMarkets(map).map((each) => each.language))];
  const slugs = await postSlugsIn(post.id, languages);
  // D82: the post's own SEO fields first, then its title and summary, then the site's.
  return withSeo(
    {
      title: content.title,
      ...(content.excerpt === undefined ? {} : { description: content.excerpt }),
      alternates: {
        canonical: href,
        // D80: every open market, at the post's address in its language.
        languages: hreflangAlternates((each) => postPath(slugs[each.language]), map),
      },
      openGraph: {
        type: "article",
        title: content.title,
        url: href,
        publishedTime: content.publishedAt,
        ...(content.image === undefined ? {} : { images: [content.image.src] }),
      },
    },
    post.meta,
    settings.seo,
  );
}

export default async function PostRoute({ params }: Props) {
  const [{ slug }, { isEnabled: draft }] = await Promise.all([params, draftMode()]);
  const data = await readPost(slug, draft);
  if (data === null) notFound();
  const { market, post, content, messages, href } = data;
  const shell = await getShellData();
  const context = {
    market,
    map: shell.map,
    paths: shellPaths(shell.categories, shell.pages),
  };
  return (
    <>
      <script
        type="application/ld+json"
        // The editor's texts, escaped by `jsonLdText` so they cannot close the element.
        dangerouslySetInnerHTML={{
          __html: jsonLdText(postJsonLd({ post: content, href, language: market.htmlLang })),
        }}
      />
      <PostTemplate
        {...content}
        copy={postCopy(messages)}
        locale={market.htmlLang}
        timeZone={market.timeZone}
      >
        {post.content == null ? undefined : (
          <CmsRichText data={post.content as never} context={context} />
        )}
      </PostTemplate>
      {/* `siteOrigin()`, Payload's `serverURL`: the island ignores a message from any other origin. */}
      {draft ? <RefreshOnSave serverURL={siteOrigin()} /> : null}
    </>
  );
}
