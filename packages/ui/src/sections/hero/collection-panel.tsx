// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"). A `collection-switcher`
// hero's collection: its picture and the way into its listing. A tab's panel in the island
// (`collection-tabs.tsx`), and the first collection's under the list of links without scripts
// (`collection-switcher.tsx`). Its own module, not the island's, so the server's render imports no
// part of the island (D102). A server component (the Image atom is a client one).
import type { HeroCollection } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** A collection's picture and its link: a tab's panel, and the list's first item without scripts. */
function CollectionPanel({
  collection,
  shopLabel,
  priority,
  prefetch,
}: {
  collection: HeroCollection;
  shopLabel: string;
  priority?: boolean;
  prefetch?: boolean | null;
}) {
  return (
    <>
      <Image
        src={collection.image.src}
        alt={collection.image.alt}
        ratio="video"
        radius="xl"
        sizes="(min-width: 1280px) 1216px, 100vw"
        priority={priority}
        className="w-full"
        data-slot="hero-collection-image"
      />
      <NextLink
        href={collection.href as LinkHref}
        prefetch={prefetch}
        data-slot="hero-collection-link"
        className={cn(buttonVariants({ size: "lg" }), "max-w-full wrap-anywhere")}
      >
        {shopLabel}
        <span className="sr-only">: {collection.title}</span>
      </NextLink>
    </>
  );
}

export { CollectionPanel };
