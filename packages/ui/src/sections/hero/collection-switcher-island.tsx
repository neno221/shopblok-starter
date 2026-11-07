// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; D102). The loader of the
// `collection-switcher` hero's tabs: a client component whose `next/dynamic` fetches the tabs'
// module (`collection-tabs.tsx`) when it renders in the browser, so that module is no route's first
// load; only this small loader is (T77's probe: `dynamic()` must be called in a client component,
// never in a server one). The server renders nothing here (`ssr: false`): its HTML has the list of
// the collections' links, which the tabs replace once they are drawn.
"use client";

import dynamic from "next/dynamic";
import type { HeroCollectionTabsProps } from "./collection-tabs";

const HeroCollectionTabs = dynamic(() => import("./collection-tabs"), { ssr: false });

function HeroCollectionSwitcherIsland(props: HeroCollectionTabsProps) {
  return <HeroCollectionTabs {...props} />;
}

export { HeroCollectionSwitcherIsland };
