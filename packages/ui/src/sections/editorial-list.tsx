// Ours (T66, SETUP.md "Posts and the journal (T66)"; SPEC §7.4 `editorialList`, D79). Posts of the
// journal on a page: the newest or the editor's picks, in the market's language, as cards (one
// column on a phone, two from `md`, three from `lg`), under the section's heading, with the way to
// the journal when the editor shows it. A server component.
import type { EditorialListSection as EditorialListSectionData } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { PostCard } from "@shopblok/ui/sections/post-card";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";

/** The columns from `lg` up: as many as there are posts, at most three. */
const columns = ["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"] as const;

type EditorialListSectionProps = EditorialListSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "postCard">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65), the day each post's date is in. */
  timeZone?: string | undefined;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function EditorialListSection({
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
  return (
    <SectionFrame
      settings={settings}
      slot="editorial-list-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <ul
        className={cn(
          "grid grid-cols-1 gap-x-6 gap-y-10",
          posts.length > 1 && "md:grid-cols-2",
          columns[Math.min(posts.length, 3) - 1],
        )}
      >
        {posts.map((post) => (
          <li key={post.id} className="min-w-0">
            <PostCard
              post={post}
              copy={copy.postCard}
              locale={locale}
              timeZone={timeZone}
              headingLevel={heading === undefined ? 2 : 3}
              sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              prefetch={prefetch}
            />
          </li>
        ))}
      </ul>
      {link === undefined ? null : (
        <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
      )}
    </SectionFrame>
  );
}

export { EditorialListSection };
export type { EditorialListSectionProps };
