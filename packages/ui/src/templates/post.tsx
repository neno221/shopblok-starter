// Ours (T66, SETUP.md "Posts and the journal (T66)"; D80, SBP static-pages.md). A post's `<main>`,
// an `<article>` in a reading column: the breadcrumbs (Home, the journal), the title as the page's
// one `<h1>`, the date (a `<time>`, in the market's time zone) and the author, the editor's summary
// as the lead, the hero picture with its own alternative text, then the post's text, which the shop
// renders from Lexical as the template's `children` (in `Prose`). A server component.
import type { Messages } from "@shopblok/i18n";
import type { PostPage } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import { PostMeta } from "@shopblok/ui/sections/post-card";
import { Prose } from "@shopblok/ui/sections/prose";
import type * as React from "react";

/** A post's words: the author line and the breadcrumbs'. */
type PostCopy = {
  journal: Pick<Messages["templates"]["journal"], "byline">;
  breadcrumbs: Messages["molecules"]["breadcrumbs"];
};

function postCopy(messages: Messages): PostCopy {
  return {
    journal: { byline: messages.templates.journal.byline },
    breadcrumbs: messages.molecules.breadcrumbs,
  };
}

type PostTemplateProps = PostPage & {
  /** The post's text, drawn in `Prose` under the picture. */
  children?: React.ReactNode;
  copy: PostCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65), the day the date is in. */
  timeZone?: string | undefined;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function PostTemplate({
  title,
  breadcrumbs,
  publishedAt,
  author,
  excerpt,
  image,
  children,
  copy,
  locale,
  timeZone,
  mainId = "main",
  as: Root = "main",
  className,
}: PostTemplateProps) {
  return (
    <Root
      id={mainId}
      data-slot="post-template"
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 pt-6 pb-12 md:gap-8 md:px-6 md:pt-8 md:pb-16 lg:px-8",
        className,
      )}
    >
      <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
      <article data-slot="post" className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6">
        <header className="flex min-w-0 flex-col gap-3">
          <h1
            data-slot="post-title"
            className="text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-4xl"
          >
            {title}
          </h1>
          <PostMeta
            publishedAt={publishedAt}
            author={author}
            copy={copy.journal}
            locale={locale}
            timeZone={timeZone}
          />
          {excerpt === undefined ? null : (
            <p data-slot="post-lead" className="text-lg text-pretty wrap-anywhere">
              {excerpt}
            </p>
          )}
        </header>
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            ratio="landscape"
            radius="lg"
            sizes="(min-width: 768px) 768px, 100vw"
            priority
          />
        )}
        {children === undefined ? null : <Prose>{children}</Prose>}
      </article>
    </Root>
  );
}

export { PostTemplate, postCopy };
export type { PostCopy, PostTemplateProps };
