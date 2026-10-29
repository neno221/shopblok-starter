// Ours (T66, SETUP.md "Posts and the journal (T66)"; D80). A post as a list draws it, on the
// journal's pages and in the `editorialList` block: the hero picture, the title as the card's one
// link (stretched over the card, so the whole card is the target), the date in the market's time
// zone with the author, and the editor's summary. The picture is decoration: the title beside it
// names the post. The title is an `<h2>` on the journal (its `<h1>` is the journal's name) and an
// `<h3>` under a section's heading. Not an entry of its own. A server component.
import { formatDate, formatMessage } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { PostCard as PostCardData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** A post card's words: the author line, the journal's `byline`. */
type PostCardCopy = Pick<Messages["templates"]["journal"], "byline">;

/** A post's date as its cards and its page draw it: the day, in the market's time zone. */
function postDate(publishedAt: string, locale: string, timeZone = "UTC"): string {
  return formatDate(publishedAt, locale, { dateStyle: "long", timeZone });
}

type PostMetaProps = {
  publishedAt: string;
  author?: string | undefined;
  copy: PostCardCopy;
  locale: string;
  timeZone?: string | undefined;
  className?: string;
};

/** The date (a `<time>` with the instant) and, when there is one, "By" the author. */
function PostMeta({ publishedAt, author, copy, locale, timeZone, className }: PostMetaProps) {
  return (
    <p
      data-slot="post-meta"
      className={cn("text-sm wrap-anywhere text-muted-foreground", className)}
    >
      <time dateTime={publishedAt}>{postDate(publishedAt, locale, timeZone)}</time>
      {author === undefined ? null : (
        <>
          <span aria-hidden="true"> · </span>
          <span>{formatMessage(copy.byline, { author }, locale)}</span>
        </>
      )}
    </p>
  );
}

type PostCardProps = {
  post: PostCardData;
  copy: PostCardCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65), the day the date is in; UTC without one. */
  timeZone?: string | undefined;
  /** `2` on the journal, `3` under a section's heading. */
  headingLevel: 2 | 3;
  /** The picture's `sizes`, from the grid the card sits in. */
  sizes: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  /** Preloads the picture: the journal's first one, its largest paint (LCP). */
  priority?: boolean;
  className?: string;
};

function PostCard({
  post,
  copy,
  locale,
  timeZone,
  headingLevel,
  sizes,
  prefetch,
  priority = false,
  className,
}: PostCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      data-slot="post-card"
      className={cn("group relative flex h-full min-w-0 flex-col gap-3", className)}
    >
      {post.image === undefined ? null : (
        <Image
          src={post.image.src}
          alt=""
          ratio="landscape"
          radius="lg"
          sizes={sizes}
          priority={priority}
          imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="text-lg leading-snug font-semibold text-balance wrap-anywhere">
          <NextLink
            href={post.href as LinkHref}
            prefetch={prefetch}
            data-slot="post-card-link"
            className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover:underline focus-visible:ring-3 focus-visible:ring-ring"
          >
            {post.title}
          </NextLink>
        </Heading>
        <PostMeta
          publishedAt={post.publishedAt}
          author={post.author}
          copy={copy}
          locale={locale}
          timeZone={timeZone}
        />
        {post.excerpt === undefined ? null : (
          <p className="mt-1 text-base text-pretty wrap-anywhere">{post.excerpt}</p>
        )}
      </div>
    </article>
  );
}

export { PostCard, PostMeta, postDate };
export type { PostCardCopy, PostCardProps, PostMetaProps };
