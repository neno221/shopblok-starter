// Vendored from shadcn/ui (`shadcn add carousel`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the strings a reader sees or hears
// are required props in the page's language (`roleDescriptionLabel` and
// `slideRoleDescriptionLabel` for the "carousel" and "slide" roles, `label` on the previous and
// next buttons, which the kit hard-coded in English); the buttons are 44 × 44 (`size="icon"`, D32;
// the kit's `icon-sm` is gone) and sit at the logical start and end (`-start-12`, `-end-12`; a
// vertical carousel centres them with `inset-x-0 mx-auto`), and their chevrons turn with
// `rtl:rotate-180` in a horizontal carousel; the track and the slides use `-ms-4` and `ps-4`; embla
// gets `direction: "rtl"` from the `dir` prop, else from Base UI's `DirectionProvider`, and the
// left and right arrow keys swap with it (a vertical carousel answers ArrowUp and ArrowDown; the
// kit used the horizontal keys for both). A client component because embla drives the DOM and
// the buttons depend on its state.
"use client";

import * as React from "react";
import { useDirection } from "@base-ui/react/direction-provider";
import { cn } from "@shopblok/ui/lib/utils";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";

import { Button } from "@shopblok/ui/atoms/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
  /** The region's role description ("carousel", in the page's language). */
  roleDescriptionLabel: string;
  /** Each slide's role description ("slide", in the page's language). */
  slideRoleDescriptionLabel: string;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

/** Give the region an accessible name too (`aria-label` or `aria-labelledby`): "Related products". */
function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  roleDescriptionLabel,
  slideRoleDescriptionLabel,
  dir,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const contextDirection = useDirection();
  // One direction for embla and the arrow keys: `opts.direction`, else `dir`, else the context's.
  const direction =
    opts?.direction ?? (dir === "rtl" || dir === "ltr" ? dir : contextDirection);
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      direction,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Horizontal: the key on the side of the previous slide, which is the right in right-to-left.
      const previousKey =
        orientation === "vertical" ? "ArrowUp" : direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      const nextKey =
        orientation === "vertical" ? "ArrowDown" : direction === "rtl" ? "ArrowLeft" : "ArrowRight";
      if (event.key === previousKey) {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === nextKey) {
        event.preventDefault();
        scrollNext();
      }
    },
    [orientation, direction, scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        roleDescriptionLabel,
        slideRoleDescriptionLabel,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription={roleDescriptionLabel}
        data-slot="carousel"
        dir={dir}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div
        className={cn("flex", orientation === "horizontal" ? "-ms-4" : "-mt-4 flex-col", className)}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation, slideRoleDescriptionLabel } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription={slideRoleDescriptionLabel}
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "ps-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
}

type CarouselButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "aria-label" | "aria-labelledby"
> & {
  /** The button's accessible name ("Previous slide" or "Next slide", in the page's language). */
  label: string;
};

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  label,
  ...props
}: CarouselButtonProps) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "inset-y-0 -start-12 my-auto"
          : "inset-x-0 -top-12 mx-auto rotate-90",
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeftIcon
        aria-hidden="true"
        className={orientation === "horizontal" ? "rtl:rotate-180" : undefined}
      />
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  label,
  ...props
}: CarouselButtonProps) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "inset-y-0 -end-12 my-auto"
          : "inset-x-0 -bottom-12 mx-auto rotate-90",
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon
        aria-hidden="true"
        className={orientation === "horizontal" ? "rtl:rotate-180" : undefined}
      />
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};
