// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). The search input and its clear
// button, the one client part of SearchField. A client component because clearing needs the field's
// text as it is typed and the input node to put focus back on. The input is a plain `type="search"`
// field that submits with its form, so typing and submitting need no JavaScript; the clear button
// is the enhancement, and it is drawn only once the page has hydrated (a button that could do
// nothing before then would be dead for a visitor whose script never loads).
"use client";

import {
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@shopblok/ui/primitives/input-group";
import { XIcon } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on the server and while hydrating, true afterwards (D44's store pattern, no effect). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

type SearchFieldInputProps = {
  /** The query parameter the form sends. */
  name: string;
  /** The query so far; the field starts with it. */
  defaultValue: string;
  /** The field's accessible name. */
  label: string;
  placeholder: string;
  /** The clear button's accessible name. */
  clearLabel: string;
};

function SearchFieldInput({
  name,
  defaultValue,
  label,
  placeholder,
  clearLabel,
}: SearchFieldInputProps) {
  const [value, setValue] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();
  return (
    <>
      <InputGroupInput
        ref={input}
        type="search"
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        enterKeyHint="search"
        autoCapitalize="off"
        spellCheck={false}
        // A query longer than the box scrolls inside it, which the field says (the DS clip check, D34).
        data-truncate=""
        // The browser's own clear mark and magnifier would sit beside ours.
        className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {hydrated && value !== "" ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon"
            aria-label={clearLabel}
            onClick={() => {
              setValue("");
              input.current?.focus();
            }}
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </>
  );
}

export { SearchFieldInput };
export type { SearchFieldInputProps };
