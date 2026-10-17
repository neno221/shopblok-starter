// Vendored from shadcn/ui (`shadcn add slider`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the thumb keeps its 16 px look and
// has a 44 × 44 hit area (`after:-inset-[15px]`: 14 px inside its 1 px border, D32), and the
// control is 44 px across, so the track is a target too; the thumb is `bg-background` (not
// `bg-white`) and draws the ring at full strength (D35) when its input has keyboard focus
// (`has-[:focus-visible]`: the kit's `focus-visible:` on the thumb never matches, because focus is
// on the hidden `<input>` inside it); the orientation variants are `data-[orientation=…]` (the
// kit's `data-horizontal` and `data-vertical` match nothing Base UI renders, so the track had no
// height); every thumb's name is the required `getThumbLabel`, and its spoken value is the
// formatted number alone (Base UI's default for a range adds the English "start range" and "end
// range"); a single number (`value={50}`) draws one thumb (the kit drew two, for `[min, max]`).
// Base UI reads the reading direction from its `DirectionProvider`. A client component because
// Base UI's slider keeps state and handles pointer and keyboard events, and the required
// `getThumbLabel` is a function, which a server page cannot pass across the boundary: a page
// renders the slider inside a client component of its own.
"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@shopblok/ui/lib/utils";

type SliderProps = SliderPrimitive.Root.Props & {
  /** Each thumb's accessible name by its index ("Minimum price", "Maximum price"), in the page's language. */
  getThumbLabel: (index: number) => string;
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  getThumbLabel,
  ...props
}: SliderProps) {
  const _values = Array.isArray(value)
    ? value
    : value !== undefined
      ? [value]
      : Array.isArray(defaultValue)
        ? defaultValue
        : defaultValue !== undefined
          ? [defaultValue]
          : [min, max];

  return (
    <SliderPrimitive.Root
      className={cn(
        "data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full",
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=horizontal]:min-h-11 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:min-w-11 data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            getAriaLabel={getThumbLabel}
            getAriaValueText={(formattedValue) => formattedValue}
            className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring transition-[color,box-shadow] select-none after:absolute after:-inset-[15px] hover:ring-4 has-[:focus-visible]:ring-4 data-disabled:pointer-events-none"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
export type { SliderProps };
