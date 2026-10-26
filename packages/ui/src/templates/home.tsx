// Ours (T51, SETUP.md "Home (T51)"; D57, D58, SBP layouts/home-page.md, components/hero.md). The
// home page's `<main>`: the hero (the page's one `<h1>`, a line, the way into the shop and a picture
// beside them, preloaded: it is the first screen's largest), the top-level categories as tiles (a
// picture and the name, one link each), the newest products as ProductCarousel, and a link to every
// product. Each section is named by its `<h2>`. Every part comes from the page's values, which a
// shop reads from Medusa (`site.ts` has the hero's words until M4's hero block); `variant` is the
// contract's one value (D57).
import type { Messages } from "@shopblok/i18n";
import type { HomePage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import {
  ProductCarousel,
  type ProductCarouselProps,
} from "@shopblok/ui/organisms/product-carousel";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type HomeCopy = {
  carousel: ProductCarouselProps["copy"];
};

/** The home's words from a whole catalog: the carousel's and its cards'. */
function homeCopy(messages: Messages): HomeCopy {
  const { molecules, organisms } = messages;
  return {
    carousel: {
      card: molecules.productCard,
      priceBlock: molecules.priceBlock,
      carousel: organisms.productCarousel,
    },
  };
}

/** The ids the sections' headings name them by. */
const HOME_IDS = { hero: "home-hero-title", categories: "home-categories-title" } as const;

type HomeTemplateProps = HomePage & {
  copy: HomeCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const section = "mx-auto w-full max-w-7xl min-w-0 px-4 md:px-6 lg:px-8";

function HomeTemplate({
  hero,
  categories,
  newArrivals,
  shopAll,
  copy,
  locale,
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: HomeTemplateProps) {
  return (
    <Root
      id={mainId}
      data-slot="home-template"
      data-variant="default"
      className={cn("flex w-full min-w-0 flex-col gap-12 pb-12 md:gap-16 md:pb-16", className)}
    >
      <section
        data-slot="home-hero"
        aria-labelledby={HOME_IDS.hero}
        className="bg-muted/50 py-8 md:py-12"
      >
        <div className={cn(section, "grid items-center gap-8 md:grid-cols-2 md:gap-12")}>
          <div className="flex min-w-0 flex-col items-start gap-4 md:gap-6">
            <h1
              id={HOME_IDS.hero}
              data-slot="home-hero-title"
              className="text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-5xl"
            >
              {hero.title}
            </h1>
            {hero.text === undefined ? null : (
              <p
                data-slot="home-hero-text"
                className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground md:text-lg"
              >
                {hero.text}
              </p>
            )}
            <NextLink
              href={hero.action.href as LinkHref}
              prefetch={prefetch}
              data-slot="home-hero-action"
              className={cn(buttonVariants({ size: "lg" }), "max-w-full")}
            >
              {hero.action.label}
            </NextLink>
          </div>
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            ratio="landscape"
            radius="xl"
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
            priority
            data-slot="home-hero-image"
          />
        </div>
      </section>

      {categories === undefined ? null : (
        <section
          data-slot="home-categories"
          aria-labelledby={HOME_IDS.categories}
          className={cn(section, "flex flex-col gap-4 md:gap-6")}
        >
          <h2 id={HOME_IDS.categories} className="text-xl font-semibold md:text-2xl">
            {categories.title}
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.items.map((tile) => (
              <li key={tile.href} className="min-w-0">
                <NextLink
                  href={tile.href as LinkHref}
                  prefetch={prefetch}
                  data-slot="home-category"
                  className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {tile.image === undefined ? (
                    <span aria-hidden="true" className="aspect-[3/4] rounded-lg bg-muted" />
                  ) : (
                    <Image
                      src={tile.image.src}
                      alt={tile.image.alt}
                      ratio="tall"
                      radius="lg"
                      sizes="(min-width: 1280px) 300px, (min-width: 768px) 25vw, 50vw"
                      imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <span className="min-h-11 text-base font-medium wrap-anywhere underline-offset-4 group-hover:underline">
                    {tile.label}
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {newArrivals === undefined ? null : (
        <div className={section}>
          <ProductCarousel
            {...newArrivals}
            copy={copy.carousel}
            locale={locale}
            prefetch={prefetch}
          />
        </div>
      )}

      <div className={cn(section, "flex justify-center")}>
        <NextLink
          href={shopAll.href as LinkHref}
          prefetch={prefetch}
          data-slot="home-shop-all"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-w-full")}
        >
          {shopAll.label}
        </NextLink>
      </div>
    </Root>
  );
}

export { HOME_IDS, HomeTemplate, homeCopy };
export type { HomeCopy, HomeTemplateProps };
