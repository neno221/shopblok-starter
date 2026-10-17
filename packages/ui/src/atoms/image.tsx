// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). `next/image` in a frame that keeps an aspect
// ratio, so nothing shifts while it loads (CLS), with the radius tokens and a skeleton that shows
// until the picture has loaded. `alt` is required by the type: describe the picture, or pass `""`
// on purpose when it is decoration next to text that says the same. So is `sizes` (T32, PR 43
// review, item 13): without it a grid card would download a full-width source. The state belongs
// to one `src`: a new `src` shows the skeleton again, and a picture that fails to load drops it and
// shows an "image missing" mark on the frame's muted fill (the `alt` stays the image's name).
"use client";

import { ImageOffIcon } from "lucide-react";
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
  /**
   * The width the picture is drawn at, per breakpoint (`(min-width: 768px) 25vw, 50vw`), which
   * picks the source to download. Required: a card that left it out would fetch a full-width one.
   */
  sizes: string;
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
  sizes,
  className,
  imageClassName,
  onLoad,
  onError,
  ...props
}: ImageProps) {
  const key = srcKey(props.src);
  // Keyed on the source, so a new `src` on the same component starts loading again.
  const [state, setState] = useState<{ key: string; status: "loaded" | "failed" } | null>(null);
  const status = state?.key === key ? state.status : "loading";
  const loaded = status === "loaded";
  return (
    <div
      data-slot="image"
      data-loaded={loaded ? "" : undefined}
      data-failed={status === "failed" ? "" : undefined}
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        ratios[ratio],
        radii[radius],
        className,
      )}
    >
      {status === "loading" ? (
        <Skeleton data-slot="image-placeholder" className="absolute inset-0 rounded-none" />
      ) : null}
      {status === "failed" ? (
        <span
          data-slot="image-failed"
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-muted-foreground"
        >
          <ImageOffIcon className="size-6" />
        </span>
      ) : null}
      <NextImage
        {...props}
        alt={alt}
        fill
        sizes={sizes}
        // The picture may finish loading before this component hydrates, so check for it as well.
        // A failure before hydration is not detected this way (`complete` with no width is also a
        // picture that has not started); `onError` catches every later one.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && state?.key !== key) {
            setState({ key, status: "loaded" });
          }
        }}
        onLoad={(event) => {
          // next/image reports a load after `decode()`; a source that has failed stays failed.
          setState((prev) =>
            prev?.key === key && prev.status === "failed" ? prev : { key, status: "loaded" },
          );
          onLoad?.(event);
        }}
        onError={(event) => {
          setState({ key, status: "failed" });
          onError?.(event);
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

/** A string for any `src` next/image takes: a URL, or a static import's `src`. */
function srcKey(src: NextImageProps["src"]): string {
  if (typeof src === "string") return src;
  return "default" in src ? src.default.src : src.src;
}

export { Image };
export type { ImageProps };
