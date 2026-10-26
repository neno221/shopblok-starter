// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D45, D50; WCAG 1.3.1, 2.5.3).
// A product's size guide: a link-styled button that sits beside the size option in the buy box,
// and the modal dialog it opens. The dialog is named "Size guide" (its title), described by the
// guide's own heading (what the table measures), and holds a units toggle (centimetres or inches),
// the table and, under it, how to measure. A client component because the dialog and the unit are
// state; every number is formatted here with `@shopblok/i18n/format` (the package's index carries
// the four catalogs, which a browser has no use for).
// - The table has one row for each size and one column for each measurement: a shopper looks up
//   their size and reads across. The first column holds the sizes (`<th scope="row">`), the
//   headers are `<th scope="col">` with the catalog's "Size" first, and the caption says the unit
//   ("Measurements in centimeters"), so the unit is text whichever is shown. The contract
//   gives one row for each measurement, and the table is its transpose.
// - Units. The values are centimetres in the contract and inches are the centimetres divided by
//   2.54, to one decimal; numbers and ranges follow the locale (`formatNumber`, so Greek writes
//   "31,5", and `formatNumberRange`, so the dash and its spacing are the locale's). A range whose
//   two ends round to the same number is written as that number, as `Intl` would write "~31,5"
//   otherwise. The toggle is Base UI's ToggleGroup with a choice always made: pressing the chosen
//   unit again does nothing, because a size guide with no unit is not a guide. Its buttons are
//   named by their full visible words ("Centimeters", "Inches"), so the visible label is the
//   accessible name (WCAG 2.5.3), and the group is named by the catalog's "Units". It starts at
//   `unit`, which the market chooses (inches in the US); the choice is the dialog's own after
//   that, and survives closing and opening it again.
// - The table's box. At 375 px the table can be wider than the popup, and the box scrolls sideways
//   (`data-slot="table-container"`, which the design system's sideways check lets off). axe's
//   `scrollable-region-focusable` wants a box that scrolls to be reachable from the keyboard, and
//   the table holds nothing focusable, so the box is a labelled region with `tabIndex={0}` and a
//   focus ring, named by the caption. The Table primitive draws its own container and takes no
//   props for it, so this file draws the container and uses the primitive's parts for the rest
//   (a prop on the primitive would let T39's tables do the same). The box is always focusable, not
//   only when it overflows: whether it scrolls depends on the window and the language, and a tab
//   stop that appears and disappears with them is stranger than a steady one. Each column header
//   is at least 5 rem wide (`min-w-20`): `wrap-anywhere` lets a word longer than its column break,
//   but it also lets a table's automatic layout squeeze a column down to one letter, and a Greek
//   "Μέγεθος" cut into three pieces is worse than a table that scrolls.
// - The popup is a column (not the primitive's grid, whose single `auto` column a wide table could
//   widen), as wide as the table allows up to `xl`, and scrolls when it is taller than the window.
//   `defaultOpen`, `modal` and `popupClassName` are the design system's drawn-open state, as
//   SearchOverlay's are: a popup drawn open takes no focus until a reader opens it again, and with
//   `modal={false}` the page stays usable. Its entry animation stops under reduced motion (D50).
// - The trigger is a 44 px link-styled button (`triggerClassName` lets the buy box place it).
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatNumber, formatNumberRange } from "@shopblok/i18n/format";
import type { SizeGuide, SizeMeasure } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shopblok/ui/primitives/dialog";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shopblok/ui/primitives/table";
import { ToggleGroup, ToggleGroupItem } from "@shopblok/ui/primitives/toggle-group";
import { useId, useState } from "react";

type Unit = SizeGuide["unit"];

type SizeGuideDialogProps = SizeGuide & {
  /** The wording, from the catalog's `organisms.sizeGuideDialog`. */
  copy: Messages["organisms"]["sizeGuideDialog"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** Drawn open at first render (the design system's states); takes no focus until a reader opens it again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states, D45). */
  modal?: boolean;
  /** Classes for the trigger and for the popup (the design system's states cap it to their box). */
  triggerClassName?: string;
  popupClassName?: string;
};

/** Centimetres per inch. */
const CM_PER_INCH = 2.54;

/** A measurement in the unit, to one decimal: one number, or a range with the locale's dash. */
function formatMeasure(measure: SizeMeasure, unit: Unit, locale: string): string {
  const convert = (cm: number) => (unit === "in" ? cm / CM_PER_INCH : cm);
  const options = { maximumFractionDigits: 1 };
  // What a reader sees is the rounded number, so two ends that round alike are one number.
  const round = (value: number) => Math.round(value * 10) / 10;
  if (typeof measure === "number") return formatNumber(convert(measure), locale, options);
  const from = round(convert(measure.from));
  const to = round(convert(measure.to));
  return from === to
    ? formatNumber(from, locale, options)
    : formatNumberRange(from, to, locale, options);
}

function SizeGuideDialog({
  title,
  sizes,
  rows,
  unit,
  note,
  copy,
  locale,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: SizeGuideDialogProps) {
  const [shown, setShown] = useState<Unit>(unit);
  const captionId = useId();

  return (
    <Dialog defaultOpen={defaultOpen === true} modal={modal ?? true}>
      <DialogTrigger
        data-slot="size-guide-trigger"
        render={<Button variant="link" className={cn("px-2 underline", triggerClassName)} />}
      >
        {copy.open}
      </DialogTrigger>
      <DialogContent
        data-slot="size-guide"
        closeLabel={copy.close}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn("flex flex-col gap-4 motion-reduce:duration-0 sm:max-w-xl", popupClassName)}
      >
        <DialogHeader>
          <DialogTitle className="wrap-anywhere">{copy.title}</DialogTitle>
          <DialogDescription className="wrap-anywhere">{title}</DialogDescription>
        </DialogHeader>
        <ToggleGroup
          variant="outline"
          spacing={0}
          aria-label={copy.units}
          data-slot="size-guide-units"
          value={[shown]}
          onValueChange={(next) => {
            const chosen = next[0];
            // Pressing the unit that is chosen would leave none: keep it.
            if (chosen === "cm" || chosen === "in") setShown(chosen);
          }}
        >
          <ToggleGroupItem value="cm" data-slot="size-guide-unit-cm">
            {copy.centimetres}
          </ToggleGroupItem>
          <ToggleGroupItem value="in" data-slot="size-guide-unit-in">
            {copy.inches}
          </ToggleGroupItem>
        </ToggleGroup>
        <div
          data-slot="table-container"
          role="region"
          tabIndex={0}
          aria-labelledby={captionId}
          className="relative w-full overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <table data-slot="table" className="w-full caption-top text-sm">
            <TableCaption id={captionId} className="mt-0 mb-2 text-start wrap-anywhere">
              {shown === "cm" ? copy.captionCm : copy.captionIn}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="h-auto min-w-20 py-2 wrap-anywhere">
                  {copy.size}
                </TableHead>
                {rows.map((row) => (
                  <TableHead
                    key={row.id}
                    scope="col"
                    className="h-auto min-w-20 py-2 wrap-anywhere"
                  >
                    {row.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size, index) => (
                <TableRow key={size}>
                  <TableHead scope="row" className="h-auto py-2 wrap-anywhere">
                    {size}
                  </TableHead>
                  {rows.map((row) => {
                    const measure = row.cm[index];
                    return (
                      <TableCell key={row.id} className="tabular-nums">
                        {measure === undefined ? "" : formatMeasure(measure, shown, locale)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
        {note === undefined ? null : (
          <p data-slot="size-guide-note" className="text-sm wrap-anywhere text-muted-foreground">
            {note}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { SizeGuideDialog };
export type { SizeGuideDialogProps };
