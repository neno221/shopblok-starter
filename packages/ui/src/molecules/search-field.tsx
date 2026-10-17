// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). A search field: a `search`
// landmark around a plain GET form (`action` is the search page, the input's `name` is `q` unless
// given), a labelled `type="search"` input with a decorative magnifier, a clear button and a submit
// button with its text. It submits without JavaScript, and the query lands in the URL (SPEC §8.4).
// The landmark is a `<div role="search">` rather than `<search>`, whose role the test tools do not
// know yet; both name the same landmark. The clear button, shown when there is text, empties the
// field and returns focus to it; it lives in the one small client part (`search-field-client.tsx`)
// and appears once the page has hydrated. The input and the landmark share the field's name. The
// button wraps below the field when the room is short (a long German or Greek label), so the field
// never shrinks under about 190 px. A server component that renders that client part.
import type { Messages } from "@shopblok/i18n";
import type { SearchQuery } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { InputGroup, InputGroupAddon } from "@shopblok/ui/primitives/input-group";
import { SearchIcon } from "lucide-react";
import type * as React from "react";
import { SearchFieldInput } from "./search-field-client";

type SearchFieldProps = Omit<
  React.ComponentProps<"div">,
  "children" | "role" | "aria-label" | "aria-labelledby"
> &
  SearchQuery & {
    /** The wording, from the catalog's `molecules.searchField`. */
    copy: Messages["molecules"]["searchField"];
    /** The query parameter and the input's name. Default `q`. */
    name?: string;
  };

function SearchField({ action, query, copy, name = "q", className, ...props }: SearchFieldProps) {
  return (
    <div
      role="search"
      aria-label={copy.label}
      data-slot="search-field"
      className={cn("w-full min-w-0", className)}
      {...props}
    >
      <form action={action} method="get" className="flex flex-wrap items-center gap-2">
        <InputGroup className="flex-1 basis-48">
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          {/* A new query from the server starts the field again from it. */}
          <SearchFieldInput
            key={query}
            name={name}
            defaultValue={query}
            label={copy.label}
            placeholder={copy.placeholder}
            clearLabel={copy.clear}
          />
        </InputGroup>
        {/* At most the row's width, so a long label wraps inside the button. */}
        <Button type="submit" className="max-w-full">
          {copy.submit}
        </Button>
      </form>
    </div>
  );
}

export { SearchField };
export type { SearchFieldProps };
