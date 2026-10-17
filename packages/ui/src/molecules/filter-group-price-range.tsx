// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"): the price range of FilterGroup, the
// part that needs JavaScript. A slider with two thumbs and two number fields that stay in step: a
// thumb moves the numbers, a number moves its thumb. The fields are the form's (`{id}.min` and
// `{id}.max`, in major units) and work alone before the page has JavaScript; the slider sends
// nothing (its thumbs are not named fields). A field left empty means "no limit", and a thumb
// pushed to an end of the track empties its field again, so an untouched range sends empty
// parameters rather than the bounds, and the app can drop them from the URL. A client component: it
// keeps what is typed, and the slider's thumb names are a function (`getThumbLabel`), which a
// server component cannot pass. It takes strings, never the catalog: the server part formats them,
// so no message formatter reaches the browser.
"use client";

import { Input } from "@shopblok/ui/atoms/input";
import { Label } from "@shopblok/ui/atoms/label";
import { Slider } from "@shopblok/ui/primitives/slider";
import { useId, useState } from "react";

type PriceRangeProps = {
  /** The facet's id: the fields are named `{id}.min` and `{id}.max`. */
  id: string;
  /** ISO 4217, upper case: the thumbs speak their value as money in this currency. */
  currencyCode: string;
  /** The slider's ends, in major units. */
  min: number;
  max: number;
  /** The range the visitor chose; none while it is untouched. */
  selected?: { min: number; max: number };
  /** The market's `<html lang>`: how the thumbs speak their value. */
  locale: string;
  /** The names of the two thumbs and of the two fields ("Minimum price", "Maximum price"). */
  minimumLabel: string;
  maximumLabel: string;
  /** What the ends are, written in the market's money ("Prices from $0.00 to $150.00"). */
  boundsText: string;
};

/** What a field holds as a number; empty, or not a number, is no limit. */
function parse(text: string): number | undefined {
  if (text.trim() === "") return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function PriceRange({
  id,
  currencyCode,
  min,
  max,
  selected,
  locale,
  minimumLabel,
  maximumLabel,
  boundsText,
}: PriceRangeProps) {
  const uid = useId();
  // A bound that is the slider's own end is "no limit": its field starts empty.
  const [low, setLow] = useState(
    selected === undefined || selected.min <= min ? "" : String(selected.min),
  );
  const [high, setHigh] = useState(
    selected === undefined || selected.max >= max ? "" : String(selected.max),
  );

  const clamp = (value: number) => Math.min(Math.max(value, min), max);
  const lowValue = clamp(parse(low) ?? min);
  const highValue = clamp(parse(high) ?? max);
  // Both fields can be typed past each other until they are left; the thumbs stay in order.
  const thumbs = [Math.min(lowValue, highValue), Math.max(lowValue, highValue)];

  function settleLow() {
    const value = parse(low);
    if (value === undefined) {
      setLow("");
      return;
    }
    const other = parse(high);
    const next = clamp(other === undefined ? value : Math.min(value, other));
    setLow(next <= min ? "" : String(next));
  }

  function settleHigh() {
    const value = parse(high);
    if (value === undefined) {
      setHigh("");
      return;
    }
    const other = parse(low);
    const next = clamp(other === undefined ? value : Math.max(value, other));
    setHigh(next >= max ? "" : String(next));
  }

  const thumbLabels = [minimumLabel, maximumLabel];
  const boundsId = `${uid}-bounds`;
  const lowId = `${uid}-min`;
  const highId = `${uid}-max`;

  return (
    <div data-slot="filter-range" className="flex min-w-0 flex-col gap-3">
      {max > min ? (
        // The thumbs' 44 px hit areas reach 15 px past the track at its ends: the padding keeps
        // them inside the column. A thumb's hidden `<input type="range">` is as big as the thumb
        // (14 px inside its border), which the design-system check would read as a 14 px control:
        // the classes make it the 44 px of the thumb's own hit area (14 + 15 each way), still
        // clipped away and out of the pointer's reach.
        <div className="px-4">
          <Slider
            className="[&_[data-slot=slider-thumb]>input]:-translate-x-[15px]! [&_[data-slot=slider-thumb]>input]:-translate-y-[15px]! [&_[data-slot=slider-thumb]>input]:size-11!"
            min={min}
            max={max}
            step={1}
            value={thumbs}
            locale={locale}
            format={{ style: "currency", currency: currencyCode }}
            getThumbLabel={(index) => thumbLabels[index] ?? maximumLabel}
            onValueChange={(next) => {
              const [first = min, last = max] = Array.isArray(next) ? next : [next];
              setLow(first <= min ? "" : String(first));
              setHigh(last >= max ? "" : String(last));
            }}
          />
        </div>
      ) : null}
      <p
        id={boundsId}
        data-slot="filter-range-bounds"
        className="text-sm wrap-anywhere text-muted-foreground"
      >
        {boundsText}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={lowId} className="font-normal">
            {minimumLabel}
          </Label>
          <Input
            id={lowId}
            type="number"
            inputMode="decimal"
            name={`${id}.min`}
            min={min}
            max={max}
            step="any"
            placeholder={String(min)}
            value={low}
            onChange={(event) => setLow(event.target.value)}
            onBlur={settleLow}
            aria-describedby={boundsId}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={highId} className="font-normal">
            {maximumLabel}
          </Label>
          <Input
            id={highId}
            type="number"
            inputMode="decimal"
            name={`${id}.max`}
            min={min}
            max={max}
            step="any"
            placeholder={String(max)}
            value={high}
            onChange={(event) => setHigh(event.target.value)}
            onBlur={settleHigh}
            aria-describedby={boundsId}
          />
        </div>
      </div>
    </div>
  );
}

export { PriceRange };
export type { PriceRangeProps };
