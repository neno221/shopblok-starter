// Ours (T34, D48, SETUP.md "Cart, checkout and account molecules (T34)"). The fields of AddressForm:
// the country select and, under it, the chosen country's inputs in its order, plus the phone. A
// client component for one reason: with JavaScript, changing the country swaps the fields at once,
// keeping what was typed; without it the page is the markup the server drew (the first country's
// fields, the chosen country submitted) and the server re-renders the right form (D48). It
// imports no i18n: the server hands it every word already formatted and the formats of the
// region's countries only (`AddressFormCountryView`), never the format module or the catalogs.
// All the fields sit in one grid, flat and keyed by name, in the country's reading order, so a
// field that two countries share keeps its place in the page, its focus and its value across a
// swap; the typed values live here, so a field that goes and comes back has its text again. A row
// of the format is a run of cells that add up to a full row from 28 rem of form width (a
// container query: the form decides, not the viewport) and stacks below it. What a shopper types
// before hydration is adopted when the fields hydrate (T58): React keeps such text in the page but
// not in this state, so the next render (a keystroke in another field) would empty the field.
"use client";

import type { AddressFieldName } from "@shopblok/i18n";
import { Input } from "@shopblok/ui/atoms/input";
import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { cn } from "@shopblok/ui/lib/utils";
import { Field, FieldDescription, FieldLabel } from "@shopblok/ui/primitives/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@shopblok/ui/primitives/input-group";
import { CircleAlertIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";

/** A field the form posts: Medusa's address fields (what a country's format picks from) and the phone. */
type AddressInputName = AddressFieldName | "phone";

/** A field that can have an error: the inputs and the country. */
type AddressFormField = AddressInputName | "countryCode";

/** The `autocomplete` token of each field (WCAG 1.3.5), before an optional `shipping` or `billing`. */
const TOKENS: Record<AddressFormField, string> = {
  firstName: "given-name",
  lastName: "family-name",
  company: "organization",
  address1: "address-line1",
  address2: "address-line2",
  city: "address-level2",
  province: "address-level1",
  postalCode: "postal-code",
  countryCode: "country",
  phone: "tel",
};

/** One country as the browser needs it: its format (rows, required fields) and its words, made on the server. */
type AddressFormCountryView = {
  /** ISO 3166-1 alpha-2 in lower case: the option's value. */
  code: string;
  /** The country's name in the page's language: the option's text. */
  name: string;
  /** What is said once when this country is chosen ("The address fields now follow …"). */
  announcement: string;
  /** The fields, a row a line of the country's format, in its order. */
  rows: AddressFieldName[][];
  /** Each field's label, by what the country calls it ("ZIP code", "Prefecture"). */
  labels: Record<AddressFieldName, string>;
  /** The fields that must be filled; the others are marked optional. */
  required: AddressFieldName[];
  postalCode?: {
    /** Written for `<input pattern>`; unset when the country has none. */
    pattern?: string;
    /** "Enter a postal code like 2008": the pattern mismatch bubble's text. */
    title?: string;
    /** "For example: 2008": under the field, so the shape is known before typing. */
    hint?: string;
    /** Written before the code (`CH-`): drawn beside the field, never typed. */
    prefix?: string;
    /** Digits only: the numeric keyboard. */
    numeric: boolean;
  };
};

type AddressFormFieldsProps = {
  /** `shipping` or `billing`: prefixes every `autocomplete` token, so a browser fills the right address. */
  section?: "shipping" | "billing";
  countryLabel: string;
  phoneLabel: string;
  /** "(optional)": after the label of a field that may stay empty. */
  optionalMark: string;
  /** The region's countries, in the select's order. */
  countries: AddressFormCountryView[];
  /** The country the form starts with. */
  country: string;
  /** What is typed so far, by field. */
  values: Partial<Record<AddressInputName, string>>;
  /** Error texts, by field. They are for the starting country: choosing another drops them. */
  errors: Partial<Record<AddressFormField, string>>;
  /** While the form is being sent: the fields keep their values and cannot change. */
  readOnly: boolean;
};

/** A cell's width in sixths of a row, from the container's `md`: a literal each, for Tailwind to see. */
const CELL: Record<number, string> = {
  2: "@md:col-span-2",
  3: "@md:col-span-3",
  4: "@md:col-span-4",
  6: "@md:col-span-6",
};

/** How a row of the format shares the width: a postal code takes a third, two others half each, three a third each. */
function cellsOf(row: AddressFieldName[]): number[] {
  if (row.length === 2) {
    if (row[0] === "postalCode") return [2, 4];
    if (row[1] === "postalCode") return [4, 2];
    return [3, 3];
  }
  if (row.length === 3) return [2, 2, 2];
  return row.map(() => 6);
}

type AddressFieldProps = {
  name: AddressInputName;
  label: string;
  optionalMark: string;
  required: boolean;
  token: string;
  value: string;
  onValueChange: (value: string) => void;
  readOnly: boolean;
  error: string | undefined;
  postalCode?: AddressFormCountryView["postalCode"];
  className?: string;
};

function AddressField({
  name,
  label,
  optionalMark,
  required,
  token,
  value,
  onValueChange,
  readOnly,
  error,
  postalCode,
  className,
}: AddressFieldProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hint = name === "postalCode" ? postalCode?.hint : undefined;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter(Boolean)
    .join(" ");
  const common = {
    id: inputId,
    name,
    value,
    required,
    readOnly,
    autoComplete: token,
    "aria-invalid": error === undefined ? undefined : (true as const),
    "aria-describedby": describedBy === "" ? undefined : describedBy,
    // A value longer than the box scrolls inside it: the design system's clipping check is told.
    "data-truncate": "",
    spellCheck: false,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value),
  };
  const postal = name === "postalCode" ? postalCode : undefined;
  return (
    <Field
      data-slot="address-field"
      data-field={name}
      data-invalid={error === undefined ? undefined : true}
      className={cn("col-span-6 gap-2", className)}
    >
      <FieldLabel htmlFor={inputId} className="flex-wrap">
        {label}{" "}
        {required ? null : (
          <span className="font-normal text-muted-foreground">{optionalMark}</span>
        )}
      </FieldLabel>
      {name === "phone" ? (
        <Input {...common} type="tel" inputMode="tel" />
      ) : postal?.prefix === undefined ? (
        <Input
          {...common}
          type="text"
          {...(postal === undefined
            ? {}
            : {
                pattern: postal.pattern,
                title: postal.title,
                inputMode: postal.numeric ? ("numeric" as const) : undefined,
              })}
        />
      ) : (
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText aria-hidden="true" data-slot="address-field-prefix">
              {postal.prefix}
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            {...common}
            type="text"
            pattern={postal.pattern}
            title={postal.title}
            inputMode={postal.numeric ? "numeric" : undefined}
          />
        </InputGroup>
      )}
      {hint === undefined ? null : (
        <FieldDescription id={hintId} className="wrap-break-word">
          {hint}
        </FieldDescription>
      )}
      {error === undefined ? null : (
        <p
          id={errorId}
          data-slot="address-field-error"
          className="flex items-start gap-2 text-sm leading-snug text-destructive"
        >
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 wrap-break-word">{error}</span>
        </p>
      )}
    </Field>
  );
}

function AddressFormFields({
  section,
  countryLabel,
  phoneLabel,
  optionalMark,
  countries,
  country: startCountry,
  values: startValues,
  errors,
  readOnly,
}: AddressFormFieldsProps) {
  const id = useId();
  const [country, setCountry] = useState(startCountry);
  const [values, setValues] = useState(startValues);
  const [announcement, setAnnouncement] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  // T58: a field typed in (or a country chosen) before hydration keeps its text in the page, but
  // React hydrates the state from the server's values, and the next render of a controlled field
  // writes that state back: the text the shopper typed is gone (W5, `next dev` on the PC). When the
  // fields hydrate, the state takes what the page holds. The effect also runs when Next's
  // `<Activity>` shows the page again, and twice under StrictMode; there, as after any client
  // render, the page holds the state's own values, so it changes nothing. Before paint, so nothing
  // flickers.
  useLayoutEffect(() => {
    const root = grid.current;
    if (root === null) return;
    const typed: Partial<Record<AddressInputName, string>> = {};
    for (const input of root.querySelectorAll<HTMLInputElement>("input[name]")) {
      const name = input.name as AddressInputName;
      if (input.value !== (startValues[name] ?? "")) typed[name] = input.value;
    }
    if (Object.keys(typed).length > 0) setValues((current) => ({ ...current, ...typed }));
    const chosen = root.querySelector<HTMLSelectElement>('select[name="countryCode"]')?.value;
    const next = countries.find((candidate) => candidate.code === chosen);
    if (next !== undefined && next.code !== startCountry) {
      setCountry(next.code);
      setAnnouncement(next.announcement);
    }
    // No dependencies: after hydration, changes reach the state through the fields' own handlers.
  }, []);
  const view = countries.find((candidate) => candidate.code === country) ?? countries[0];
  if (view === undefined) return null;
  const token = (field: AddressFormField) =>
    section === undefined ? TOKENS[field] : `${section} ${TOKENS[field]}`;
  // The server's errors were about the country it drew; once the shopper picks another they are stale.
  const shown = country === startCountry ? errors : {};
  const set = (field: AddressInputName) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const selectId = `${id}-country`;
  const selectErrorId = `${id}-country-error`;
  return (
    <div data-slot="address-form-fields" className="@container w-full min-w-0">
      <div ref={grid} className="grid grid-cols-6 gap-x-3 gap-y-4">
        <Field
          data-slot="address-field"
          data-field="countryCode"
          data-invalid={shown.countryCode === undefined ? undefined : true}
          className="col-span-6 gap-2"
        >
          <FieldLabel htmlFor={selectId}>{countryLabel}</FieldLabel>
          <NativeSelect
            id={selectId}
            name="countryCode"
            required
            autoComplete={token("countryCode")}
            aria-invalid={shown.countryCode === undefined ? undefined : true}
            aria-describedby={shown.countryCode === undefined ? undefined : selectErrorId}
            aria-disabled={readOnly ? true : undefined}
            value={country}
            className="w-full"
            onChange={(event) => {
              // A form being sent keeps its country, as its text fields keep theirs.
              if (readOnly) return;
              const next = countries.find((candidate) => candidate.code === event.target.value);
              if (next === undefined) return;
              setCountry(next.code);
              setAnnouncement(next.announcement);
            }}
          >
            {countries.map((option) => (
              <NativeSelectOption key={option.code} value={option.code}>
                {option.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {shown.countryCode === undefined ? null : (
            <p
              id={selectErrorId}
              data-slot="address-field-error"
              className="flex items-start gap-2 text-sm leading-snug text-destructive"
            >
              <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 wrap-break-word">{shown.countryCode}</span>
            </p>
          )}
        </Field>
        {view.rows.flatMap((row) => {
          const cells = cellsOf(row);
          return row.map((name, index) => (
            <AddressField
              key={name}
              name={name}
              label={view.labels[name]}
              optionalMark={optionalMark}
              required={view.required.includes(name)}
              token={token(name)}
              value={values[name] ?? ""}
              onValueChange={set(name)}
              readOnly={readOnly}
              error={shown[name]}
              postalCode={view.postalCode}
              className={CELL[cells[index] ?? 6]}
            />
          ));
        })}
        <AddressField
          name="phone"
          label={phoneLabel}
          optionalMark={optionalMark}
          required={false}
          token={token("phone")}
          value={values.phone ?? ""}
          onValueChange={set("phone")}
          readOnly={readOnly}
          error={shown.phone}
        />
        {/* Said once when the country changes; the region is always in the page, so it is announced. */}
        <div
          role="status"
          aria-live="polite"
          data-slot="address-form-country-status"
          className="sr-only"
        >
          {announcement}
        </div>
      </div>
    </div>
  );
}

export { AddressFormFields, TOKENS };
export type { AddressFormCountryView, AddressFormField, AddressFormFieldsProps, AddressInputName };
