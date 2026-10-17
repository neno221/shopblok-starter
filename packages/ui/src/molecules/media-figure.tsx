// Ours (T32, SETUP.md "Product molecules (T32)"). A <figure>: the Image atom, and a <figcaption>
// with the caption and the credit, either of which may be missing (without both there is no
// <figcaption>). The credit goes through the copy ("Photo: {credit}"), because the contract holds
// the name alone. `sizes` is required, as Image's is. The frame's aspect ratio is the one of the
// Image atom's closest to the picture's own, so a figure is cropped as little as the atom allows,
// and `ratio` sets it when the page knows better. A server component: it holds no state and
// handles no events.
import { formatMessage } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { MediaFigure as MediaFigureData } from "@shopblok/registry/contracts";
import { Image, type ImageProps } from "@shopblok/ui/atoms/image";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type Ratio = NonNullable<ImageProps["ratio"]>;

// The Image atom's frames as width over height.
const ratios: Record<Ratio, number> = {
  square: 1,
  portrait: 4 / 5,
  tall: 3 / 4,
  landscape: 3 / 2,
  video: 16 / 9,
};

/** The Image ratio nearest to a picture's width and height, compared as proportions (log scale). */
function nearestRatio(width: number, height: number): Ratio {
  const target = Math.log(width / height);
  let best: Ratio = "square";
  let bestDistance = Infinity;
  for (const [name, value] of Object.entries(ratios) as [Ratio, number][]) {
    const distance = Math.abs(Math.log(value) - target);
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}

type MediaFigureProps = Omit<React.ComponentProps<"figure">, "children"> & {
  /** The picture with its alternative text, and the caption and credit when it has them. */
  figure: MediaFigureData;
  /** The credit's wording, from the catalog's `molecules.mediaFigure`. */
  copy: Messages["molecules"]["mediaFigure"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The width the picture is drawn at, per breakpoint: Image's required `sizes`. */
  sizes: string;
  /** The frame's aspect ratio; by default the Image ratio nearest to the picture's. */
  ratio?: Ratio;
};

function MediaFigure({
  figure,
  copy,
  locale,
  sizes,
  ratio,
  className,
  ...props
}: MediaFigureProps) {
  const { image, caption, credit } = figure;
  return (
    <figure
      data-slot="media-figure"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    >
      <Image
        src={image.src}
        alt={image.alt}
        sizes={sizes}
        ratio={ratio ?? nearestRatio(image.width, image.height)}
      />
      {caption !== undefined || credit !== undefined ? (
        <figcaption
          data-slot="media-figure-caption"
          className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground"
        >
          {caption !== undefined ? <span className="wrap-anywhere">{caption}</span> : null}
          {credit !== undefined ? (
            <span data-slot="media-figure-credit" className="text-xs wrap-anywhere">
              {formatMessage(copy.credit, { credit }, locale)}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export { MediaFigure };
export type { MediaFigureProps };
