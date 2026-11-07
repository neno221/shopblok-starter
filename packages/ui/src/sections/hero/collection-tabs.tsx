// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a, D100, D102).
// The `collection-switcher` hero's island: its collections as Base UI tabs, each tab's panel the
// collection's picture and the way into its listing. The arrow keys move between the tabs and show
// each one's panel as it is reached (automatic activation: a panel is one picture and one link, so
// it is there at once); nothing changes by itself (D100, WCAG 2.2.2). The tab list is named by the
// hero's heading. Without scripts, and until this module has loaded, the section draws its list of
// the collections' links instead (`collection-switcher.tsx`), which a crawler reads too; drawn, the
// tabs hide that list through the section's `:has()` rule. Loaded by `next/dynamic` in
// `collection-switcher-island.tsx`, so its code is no route's first load (D102): its `displayName`
// is the marker `first-load.ts`' `keptOut` finds its chunk by.
"use client";

import type { HeroCollection } from "@shopblok/registry/contracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shopblok/ui/primitives/tabs";
import { CollectionPanel } from "./collection-panel";

type HeroCollectionTabsProps = {
  collections: readonly HeroCollection[];
  /** The hero heading's id: the tab list's name. */
  labelledBy: string;
  /** "Shop the collection": each panel's link. */
  shopLabel: string;
  /** The first picture is preloaded when the hero opens the page. */
  priority?: boolean;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
};

function HeroCollectionTabs({
  collections,
  labelledBy,
  shopLabel,
  priority,
  prefetch,
}: HeroCollectionTabsProps) {
  return (
    <Tabs data-slot="hero-collection-tabs" defaultValue={0} className="gap-6">
      <TabsList
        aria-labelledby={labelledBy}
        activateOnFocus
        variant="line"
        className="w-full flex-wrap justify-start"
      >
        {collections.map((collection, index) => (
          <TabsTrigger
            key={collection.href}
            value={index}
            data-slot="hero-collection-tab"
            className="flex-none px-3 text-base wrap-anywhere"
          >
            {collection.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {collections.map((collection, index) => (
        <TabsContent
          key={collection.href}
          value={index}
          data-slot="hero-collection-panel"
          className="flex flex-col items-start gap-6"
        >
          <CollectionPanel
            collection={collection}
            shopLabel={shopLabel}
            priority={priority === true && index === 0}
            prefetch={prefetch}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
HeroCollectionTabs.displayName = "shopblok:hero-collection-tabs";

export default HeroCollectionTabs;
export { HeroCollectionTabs };
export type { HeroCollectionTabsProps };
