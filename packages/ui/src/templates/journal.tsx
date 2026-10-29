// Ours (T66, SETUP.md "Posts and the journal (T66)"; D80, D59, SBP static-pages.md). The journal's
// `<main>`: the breadcrumbs (Home, the journal), the journal's name as the page's one `<h1>`, the
// posts of this page, newest first, as cards (one column on a phone, two from `md`, three from
// `lg`), and the pager, whose links are paths (`/journal/page/2`, the page's `hrefFor`). A journal
// with no post says so and points at the shop. A server component.
import type { Messages } from "@shopblok/i18n";
import type { JournalPage } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import { PostCard } from "@shopblok/ui/sections/post-card";
import { NewspaperIcon } from "lucide-react";

/** The journal's words: its own, the breadcrumbs' and the pager's. */
type JournalCopy = {
  journal: Messages["templates"]["journal"];
  breadcrumbs: Messages["molecules"]["breadcrumbs"];
  pagination: Messages["molecules"]["pagination"];
};

function journalCopy(messages: Messages): JournalCopy {
  return {
    journal: messages.templates.journal,
    breadcrumbs: messages.molecules.breadcrumbs,
    pagination: messages.molecules.pagination,
  };
}

type JournalTemplateProps = JournalPage & {
  copy: JournalCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65), the day each post's date is in. */
  timeZone?: string | undefined;
  /** The address of a page of the journal (`/journal/page/2`). */
  hrefFor: (page: number) => string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const container = "mx-auto w-full max-w-7xl min-w-0 px-4 md:px-6 lg:px-8";

function JournalTemplate({
  title,
  breadcrumbs,
  posts,
  page,
  shopHref,
  copy,
  locale,
  timeZone,
  hrefFor,
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: JournalTemplateProps) {
  // The largest paint is the top row's first picture: it is preloaded, the others load lazily.
  const lead = posts.slice(0, 3).findIndex((post) => post.image !== undefined);
  return (
    <Root
      id={mainId}
      data-slot="journal-template"
      className={cn(
        container,
        "flex flex-col gap-6 pt-6 pb-12 md:gap-8 md:pt-8 md:pb-16",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <h1
          data-slot="journal-title"
          className="text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-4xl"
        >
          {title}
        </h1>
      </div>
      {posts.length === 0 ? (
        <EmptyState
          icon={NewspaperIcon}
          title={copy.journal.empty.title}
          text={copy.journal.empty.text}
          action={{ label: copy.journal.empty.action, href: shopHref }}
          prefetch={prefetch}
        />
      ) : (
        <ul
          data-slot="journal-posts"
          className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <li key={post.id} className="min-w-0">
              <PostCard
                post={post}
                copy={copy.journal}
                locale={locale}
                timeZone={timeZone}
                headingLevel={2}
                priority={index === lead}
                sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                prefetch={prefetch}
              />
            </li>
          ))}
        </ul>
      )}
      <Pagination {...page} hrefFor={hrefFor} copy={copy.pagination} locale={locale} />
    </Root>
  );
}

export { JournalTemplate, journalCopy };
export type { JournalCopy, JournalTemplateProps };
