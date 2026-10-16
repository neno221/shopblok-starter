// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). `next/image` in a frame that keeps an aspect
// ratio, so nothing shifts while it loads (CLS), with the radius tokens and a skeleton that shows
// until the picture has loaded. `alt` is required by the type: describe the picture, or pass `""`
// on purpose when it is decoration next to text that says the same.
"use client";

import NextImage, { type ImageProps as NextImageProps } from "next/image";
import { useState } from "react";
import { Skeleton } from "@shopblok/ui/atoms/skeleton";
import { cn } from "@shopblok/ui/lib/utils";

const ratios = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  tall: "aspect-[3/4]",
  landscape: "aspect-[3/2]",
  video: "aspect-video",
} as const;

const radii = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

type ImageProps = Omit<NextImageProps, "fill" | "width" | "height" | "alt" | "className"> & {
  /** What the picture shows. An empty string marks it as decoration, and has to be written. */
  alt: string;
  ratio?: keyof typeof ratios;
  radius?: keyof typeof radii;
  /** How the picture fills the frame. */
  fit?: "cover" | "contain";
  /** The frame's classes (width, margins). */
  className?: string;
  /** The picture's own classes. */
  imageClassName?: string;
};

function Image({
  alt,
  ratio = "square",
  radius = "md",
  fit = "cover",
  sizes = "100vw",
  className,
  imageClassName,
  onLoad,
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      data-slot="image"
      data-loaded={loaded ? "" : undefined}
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        ratios[ratio],
        radii[radius],
        className,
      )}
    >
      {loaded ? null : (
        <Skeleton data-slot="image-placeholder" className="absolute inset-0 rounded-none" />
      )}
      <NextImage
        {...props}
        alt={alt}
        fill
        sizes={sizes}
        // The picture may finish loading before this component hydrates, so check for it as well.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        className={cn(
          "transition-opacity motion-reduce:transition-none",
          fit === "cover" ? "object-cover" : "object-contain",
          loaded ? "opacity-100" : "opacity-0",
          imageClassName,
        )}
      />
    </div>
  );
}

export { Image };
export type { ImageProps };
