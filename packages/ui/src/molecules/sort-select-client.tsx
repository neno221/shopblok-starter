// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). SortSelect's select, the one
// client part: a client component because it submits its form when the choice changes (an event
// handler). The select itself is the NativeSelect atom inside the server-rendered form, so before
// this hydrates the form still works with its button. A choice made with a pointer or from the
// opened list submits at once; one made by pressing a key on the closed select does not, because
// some browsers change the value on every arrow press and the page would reload on the first
// (WCAG 3.2.2: no change of context on input without warning). That reader presses the button.
"use client";

import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { useRef } from "react";

type SortSelectFieldProps = {
  id: string;
  /** The query parameter. */
  name: string;
  /** The value chosen when the page was drawn. */
  defaultValue: string;
  options: { value: string; label: string }[];
  /** Classes for the select's wrapper. */
  className?: string;
};

function SortSelectField({ id, name, defaultValue, options, className }: SortSelectFieldProps) {
  // True from the key press that may change the value until the key comes up. A key that opens the
  // native list sends its keyup to the list, not here, so a pointer press clears it too (PR 55
  // review): otherwise every later choice with the mouse would stop submitting.
  const keyed = useRef(false);
  return (
    <NativeSelect
      id={id}
      name={name}
      defaultValue={defaultValue}
      className={className}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== "Tab") keyed.current = true;
      }}
      onKeyUp={() => {
        keyed.current = false;
      }}
      onPointerDown={() => {
        keyed.current = false;
      }}
      onBlur={() => {
        keyed.current = false;
      }}
      onChange={(event) => {
        if (!keyed.current) event.currentTarget.form?.requestSubmit();
      }}
    >
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

export { SortSelectField };
export type { SortSelectFieldProps };
