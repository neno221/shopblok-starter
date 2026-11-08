// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `categoryShowcase` block's entry file:
// this file is what `@shopblok/ui/sections/category-showcase` reaches, and it draws the member of
// the block's `variant`, each in its own file in `./category-showcase/` (`standard.tsx`, M4's, is
// the first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { CategoryShowcaseBanner } from "./category-showcase/banner";
import { CategoryShowcaseBento } from "./category-showcase/bento";
import { CategoryShowcaseCarousel } from "./category-showcase/carousel-island";
import { CategoryShowcaseCircles } from "./category-showcase/circles";
import { CategoryShowcaseList } from "./category-showcase/list";
import {
  CategoryShowcaseStandard,
  type CategoryShowcaseSectionProps,
} from "./category-showcase/standard";

const MEMBERS: Members<
  "category-showcase",
  (props: CategoryShowcaseSectionProps) => React.ReactNode
> = {
  standard: CategoryShowcaseStandard,
  circles: CategoryShowcaseCircles,
  bento: CategoryShowcaseBento,
  carousel: CategoryShowcaseCarousel,
  list: CategoryShowcaseList,
  banner: CategoryShowcaseBanner,
};

function CategoryShowcaseSection(props: CategoryShowcaseSectionProps) {
  const Member = pickVariant("category-showcase", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { CategoryShowcaseSection };
export type { CategoryShowcaseSectionProps };
