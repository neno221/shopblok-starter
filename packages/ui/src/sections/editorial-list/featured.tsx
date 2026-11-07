// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D80). The
// editorial list's `featured` member: the first post large (its card as the journal draws it, with
// its summary) and the others as a list beside it from `lg`, each a row of a small picture, its
// title (the row's one link, stretched over the row) and its date with the author; below `lg` the
// list follows the first post. One post alone is drawn large with no list. The pictures are
// decoration: the titles name the posts. A server component.
import type { PostCard as PostCardData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { PostCard, PostMeta } from "@shopblok/ui/sections/post-card";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import NextLink from "next/link";
import type * as React from "react";
import type { EditorialListSectionProps } from "./standard";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** A post as a row of the list: its small picture, its title and its date. */
function PostRow({
  post,
  headingLevel,
  copy,
  locale,
  timeZone,
  prefetch,
}: Pick<EditorialListSectionProps, "copy" | "locale" | "timeZone" | "prefetch"> & {
  post: PostCardData;
  headingLevel: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article data-slot="post-row" className="group relative flex min-w-0 items-start gap-4">
      {post.image === undefined ? null : (
        <Image
          src={post.image.src}
          alt=""
          ratio="landscape"
          radius="md"
          sizes="128px"
          className="w-28 shrink-0 md:w-32"
        />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="text-base leading-snug font-semibold text-balance wrap-anywhere">
          <NextLink
            href={post.href as LinkHref}
            prefetch={prefetch}
            data-slot="post-row-link"
            className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] group-hover:underline focus-visible:ring-3 focus-visible:ring-ring"
          >
            {post.title}
          </NextLink>
        </Heading>
        <PostMeta
          publishedAt={post.publishedAt}
          author={post.author}
          copy={copy.postCard}
          locale={locale}
          timeZone={timeZone}
        />
      </div>
    </article>
  );
}

function EditorialListFeatured({
  settings,
  heading,
  posts,
  link,
  copy,
  locale,
  timeZone,
  prefetch,
  className,
}: EditorialListSectionProps) {
  const [first, ...rest] = posts;
  const headingLevel = heading === undefined ? 2 : 3;
  return (
    <SectionFrame
      data-variant="featured"
      settings={settings}
      slot="editorial-list-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <div
        className={cn("grid grid-cols-1 gap-x-10 gap-y-8", rest.length > 0 && "lg:grid-cols-12")}
      >
        {first === undefined ? null : (
          <PostCard
            post={first}
            copy={copy.postCard}
            locale={locale}
            timeZone={timeZone}
            headingLevel={headingLevel}
            sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
            prefetch={prefetch}
            className={cn(rest.length > 0 && "lg:col-span-7", "[&_h2]:text-2xl [&_h3]:text-2xl")}
          />
        )}
        {rest.length === 0 ? null : (
          <ul className="flex min-w-0 flex-col gap-6 lg:col-span-5">
            {rest.map((post) => (
              <li key={post.id} className="min-w-0">
                <PostRow
                  post={post}
                  headingLevel={headingLevel}
                  copy={copy}
                  locale={locale}
                  timeZone={timeZone}
                  prefetch={prefetch}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {link === undefined ? null : (
        <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
      )}
    </SectionFrame>
  );
}

export { EditorialListFeatured };
