// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). A listing's sort as a plain GET
// form (SPEC §8.4: the sort lives in the URL): a labelled NativeSelect named `name` with the
// options and the chosen one, the listing's other parameters as hidden inputs (`params`, so a new
// sort keeps the filters), and a submit button. That is the whole of it without JavaScript. With
// it, a small client part submits the form when the choice changes (`form.requestSubmit()`), and
// the button STAYS: it is how a keyboard reader who moves through the options with the arrow keys
// applies the choice, it tells every reader that the choice is applied by pressing it (WCAG 3.2.2),
// and removing it at hydration would shift the layout. The form has no page parameter, so a new
// sort starts at the first page. A server component that renders that client part.
import type { Messages } from "@shopblok/i18n";
import type { SortState } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Label } from "@shopblok/ui/atoms/label";
import { cn } from "@shopblok/ui/lib/utils";
import { useId } from "react";
import type * as React from "react";
import { SortSelectField } from "./sort-select-client";

type SortSelectProps = Omit<React.ComponentProps<"form">, "children" | "action" | "method"> &
  SortState & {
    /** The wording, from the catalog's `molecules.sortSelect`. */
    copy: Messages["molecules"]["sortSelect"];
  };

function SortSelect({
  action,
  name,
  options,
  selected,
  params,
  copy,
  className,
  ...props
}: SortSelectProps) {
  const selectId = useId();
  return (
    <form
      action={action}
      method="get"
      data-slot="sort-select"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {params.map((param, index) => (
        <input key={`${param.name}-${index}`} type="hidden" name={param.name} value={param.value} />
      ))}
      <Label htmlFor={selectId}>{copy.label}</Label>
      <SortSelectField
        id={selectId}
        name={name}
        defaultValue={selected}
        options={options}
        className="min-w-0 flex-1 basis-40 sm:flex-none"
      />
      {/* At most the row's width, so a long label wraps inside the button. */}
      <Button type="submit" variant="outline" className="max-w-full">
        {copy.apply}
      </Button>
    </form>
  );
}

export { SortSelect };
export type { SortSelectProps };
