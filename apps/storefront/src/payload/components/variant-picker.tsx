"use client";

import { FieldDescription, FieldError, FieldLabel, useField } from "@payloadcms/ui";
import type { SelectFieldClientComponent } from "payload";
import { useId } from "react";
import type { VariantPickerCustom } from "../fields/variant";
import "./variant-picker.css";

type Option = { value: string; label: string };

const optionsOf = (options: readonly unknown[]): Option[] =>
  options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : {
          value: String((option as Option).value),
          label: String((option as { label?: unknown }).label ?? (option as Option).value),
        },
  );

/**
 * The variant picker (D85, SPEC §7.6): the `select` of `fields/variant.ts` drawn as image cards,
 * one per variant, with the registry's thumbnail and the variant's name. The cards are native
 * radio buttons in a `radiogroup` named by the field's label (WCAG 4.1.2), so the keyboard works as
 * any radio group's does: Tab reaches the chosen card, the arrow keys move and choose, Space
 * chooses the focused one. The stock label, description and error are Payload's own components.
 */
export const VariantPicker: SelectFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const { label, localized, required, options, admin } = field;
  const { path, value, setValue, showError, disabled } = useField<string>({
    potentiallyStalePath: pathFromProps,
  });
  const labelId = useId();
  const thumbnails = (admin?.custom as VariantPickerCustom | undefined)?.thumbnails ?? {};
  const locked = Boolean(readOnly || disabled);
  return (
    <div className={`field-type variant-picker${showError ? " error" : ""}`}>
      <div id={labelId}>
        <FieldLabel as="span" label={label} localized={localized} path={path} required={required} />
      </div>
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <div role="radiogroup" aria-labelledby={labelId} className="variant-picker__options">
          {optionsOf(options).map((option) => (
            <label key={option.value} className="variant-picker__card">
              <input
                type="radio"
                className="variant-picker__input"
                name={path}
                value={option.value}
                checked={value === option.value}
                disabled={locked}
                onChange={() => setValue(option.value)}
              />
              {thumbnails[option.value] === undefined ? null : (
                // The thumbnail shows the variant; the name below says it, so the picture is decoration.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnails[option.value]}
                  alt=""
                  width={300}
                  height={200}
                  loading="lazy"
                  className="variant-picker__image"
                />
              )}
              <span className="variant-picker__name">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <FieldDescription description={admin?.description} path={path} />
    </div>
  );
};
