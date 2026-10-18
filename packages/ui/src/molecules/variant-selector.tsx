// Ours (T32, SETUP.md "Product molecules (T32)"). A product's options as radio groups on Base UI's
// RadioGroup and Radio: a Swatch for a `color` option (a SizePill for a colour with neither a hex
// nor a picture), a SizePill for `size` and `other`. Arrow keys move between the values and select
// the one they land on, Space selects, and Tab leaves the group (Base UI's radio behaviour). Each
// group is named by a visible line that also says the choice ("Colour: Oatmeal", the copy's ICU
// message), through `aria-labelledby` on the radio group, not a fieldset: a fieldset's legend and
// the group would read the same name twice. A value with no available variant for the current
// choice of the other options is unavailable (SPEC §8.4): struck through, "…, Unavailable" in its
// name, and still focusable and selectable, as T23 chose for Swatch and SizePill (a shopper may
// still look at it, and the page tells them). `name` makes the hidden radio inputs submit as
// `{name}.{option id}` = value id, so it works in a form without JavaScript. A client component:
// it keeps the selection, which decides what is unavailable, and Base UI's radio group reads
// the keys; give it `value` and `onValueChange`, or `defaultValue` to leave the state to it.
// `labelEnd` (T38) puts a node at the end of one option's label line, by option id: the buy box
// draws the size guide's button there, beside "Size". It is outside the group's name (the name is
// the label alone), and an option with no node keeps the label line as it was.
"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { ProductOption, VariantChoice } from "@shopblok/registry/contracts";
import { SizePill } from "@shopblok/ui/atoms/size-pill";
import { Swatch } from "@shopblok/ui/atoms/swatch";
import { useId, useState } from "react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

/** The chosen value of each option: option id to value id. An option left out has no choice. */
type VariantSelection = Record<string, string>;

type VariantSelectorProps = Omit<
  React.ComponentProps<"div">,
  "children" | "defaultValue" | "onChange"
> &
  VariantChoice & {
    /** The choice, when the page keeps it (with `onValueChange`). */
    value?: VariantSelection;
    /** The first choice when the selector keeps it itself. */
    defaultValue?: VariantSelection;
    /** Called with the whole choice and the change that made it. */
    onValueChange?: (
      value: VariantSelection,
      change: { optionId: string; valueId: string },
    ) => void;
    /** The wording, from the catalog's `molecules.variantSelector`. */
    copy: Messages["molecules"]["variantSelector"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The form field's prefix: a group submits as `{name}.{option id}`. Without it, no field. */
    name?: string;
    /** A node at the end of an option's label line, by option id (the size guide beside "Size"). */
    labelEnd?: Partial<Record<string, React.ReactNode>>;
  };

function VariantSelector({
  options,
  variants,
  value,
  defaultValue,
  onValueChange,
  copy,
  locale,
  name,
  labelEnd,
  className,
  ...props
}: VariantSelectorProps) {
  const [kept, setKept] = useState<VariantSelection>(defaultValue ?? {});
  const selection = value ?? kept;

  function choose(optionId: string, valueId: string) {
    const next = { ...selection, [optionId]: valueId };
    if (value === undefined) setKept(next);
    onValueChange?.(next, { optionId, valueId });
  }

  /** Whether some variant that can be bought has this value and the choice of every other option. */
  function isUnavailable(optionId: string, valueId: string) {
    return !variants.some(
      (variant) =>
        variant.available &&
        variant.options[optionId] === valueId &&
        options.every((other) => {
          const chosen = selection[other.id];
          return (
            other.id === optionId || chosen === undefined || variant.options[other.id] === chosen
          );
        }),
    );
  }

  return (
    <div
      data-slot="variant-selector"
      className={cn("flex min-w-0 flex-col gap-5", className)}
      {...props}
    >
      {options.map((option) => (
        <OptionGroup
          key={option.id}
          option={option}
          chosen={selection[option.id]}
          isUnavailable={(valueId) => isUnavailable(option.id, valueId)}
          onChoose={(valueId) => choose(option.id, valueId)}
          copy={copy}
          locale={locale}
          name={name === undefined ? undefined : `${name}.${option.id}`}
          end={labelEnd?.[option.id]}
        />
      ))}
    </div>
  );
}

function OptionGroup({
  option,
  chosen,
  isUnavailable,
  onChoose,
  copy,
  locale,
  name,
  end,
}: {
  option: ProductOption;
  chosen: string | undefined;
  isUnavailable: (valueId: string) => boolean;
  onChoose: (valueId: string) => void;
  copy: Messages["molecules"]["variantSelector"];
  locale: string;
  name: string | undefined;
  end: React.ReactNode;
}) {
  const labelId = useId();
  const chosenValue = option.values.find((candidate) => candidate.id === chosen);
  const label = (
    <span
      id={labelId}
      data-slot="variant-selector-label"
      className="text-sm font-medium wrap-anywhere"
    >
      {chosenValue === undefined
        ? option.title
        : formatMessage(copy.chosen, { option: option.title, value: chosenValue.label }, locale)}
    </span>
  );
  return (
    <div data-slot="variant-selector-option" className="flex min-w-0 flex-col gap-2">
      {end === undefined || end === null || end === false ? (
        label
      ) : (
        <div
          data-slot="variant-selector-label-row"
          className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1"
        >
          {label}
          {end}
        </div>
      )}
      <RadioGroup
        aria-labelledby={labelId}
        name={name}
        value={chosenValue?.id ?? null}
        onValueChange={(next) => {
          if (next !== null) onChoose(next);
        }}
        className={cn("flex flex-wrap", option.kind === "color" ? "gap-1" : "gap-2")}
      >
        {option.values.map((candidate) => {
          const selected = candidate.id === chosenValue?.id;
          const unavailable = isUnavailable(candidate.id)
            ? ({ unavailable: true, unavailableLabel: copy.unavailable } as const)
            : {};
          return (
            <Radio.Root
              key={candidate.id}
              value={candidate.id}
              nativeButton
              render={
                option.kind === "color" &&
                (candidate.hex !== undefined || candidate.image !== undefined) ? (
                  <Swatch
                    label={candidate.label}
                    colour={candidate.hex}
                    image={candidate.image?.src}
                    selected={selected}
                    {...unavailable}
                  />
                ) : (
                  <SizePill
                    selected={selected}
                    className="max-w-full rounded-3xl wrap-anywhere"
                    {...unavailable}
                  >
                    {candidate.label}
                  </SizePill>
                )
              }
            />
          );
        })}
      </RadioGroup>
    </div>
  );
}

export { VariantSelector };
export type { VariantSelection, VariantSelectorProps };
