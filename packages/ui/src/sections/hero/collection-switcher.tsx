// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a, D100, D102).
// The hero's `collection-switcher` member: the words, then two to four collections, each the
// editor's picture and the way into its listing. In the browser they are tabs (`collection-tabs.tsx`,
// loaded on demand by `collection-switcher-island.tsx`) that switch the picture and the link. Without
// scripts, before the tabs' code has loaded and for a crawler, it is a list of the collections'
// links over the first one's picture and link: the tabs, once drawn, hide that list through the
// `:has()` rule on the wrapper, so nothing is drawn twice. The tab list is named by the heading.
// The contract refuses it without collections; the source's products are not drawn. A server
// component.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { useId } from "react";
import type * as React from "react";
import { CollectionPanel } from "./collection-panel";
import { HeroCollectionSwitcherIsland } from "./collection-switcher-island";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function HeroCollectionSwitcher({
  settings,
  eyebrow,
  heading,
  subheading,
  collections = [],
  links,
  countdown,
  copy,
  locale,
  headingLevel = 2,
  timeZone,
  frozen,
  prefetch,
  className,
}: HeroSectionProps) {
  const headingId = useId();
  const [first] = collections;
  return (
    <SectionFrame
      data-variant="collection-switcher"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col gap-10"
    >
      <div className="flex min-w-0 flex-col items-start gap-4 md:gap-6">
        <HeroEyebrow>{eyebrow}</HeroEyebrow>
        <HeroHeading id={headingId} level={headingLevel}>
          {heading}
        </HeroHeading>
        <HeroSubheading>{subheading}</HeroSubheading>
        <HeroActions
          countdown={countdown}
          links={links}
          copy={copy}
          locale={locale}
          timeZone={timeZone}
          frozen={frozen}
          prefetch={prefetch}
        />
      </div>
      {first === undefined ? null : (
        <div data-slot="hero-collections" className="group/collections flex min-w-0 flex-col gap-6">
          <HeroCollectionSwitcherIsland
            collections={collections}
            labelledBy={headingId}
            shopLabel={copy.collectionSpotlight.shop}
            priority={headingLevel === 1}
            prefetch={prefetch}
          />
          <div
            data-slot="hero-collection-list"
            className="flex flex-col items-start gap-6 group-has-data-[slot=hero-collection-tabs]/collections:hidden"
          >
            <ul aria-labelledby={headingId} className="flex flex-wrap gap-x-2 gap-y-1">
              {collections.map((collection, index) => (
                <li key={collection.href} className="min-w-0 max-w-full">
                  <NextLink
                    href={collection.href as LinkHref}
                    prefetch={prefetch}
                    className={cn(
                      "inline-flex min-h-11 min-w-11 items-center rounded-md px-3 text-base font-medium wrap-anywhere underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring",
                      index === 0 ? "text-foreground underline" : "text-muted-foreground",
                    )}
                  >
                    {collection.title}
                  </NextLink>
                </li>
              ))}
            </ul>
            <CollectionPanel
              collection={first}
              shopLabel={copy.collectionSpotlight.shop}
              priority={headingLevel === 1}
              prefetch={prefetch}
            />
          </div>
        </div>
      )}
    </SectionFrame>
  );
}

export { HeroCollectionSwitcher };
