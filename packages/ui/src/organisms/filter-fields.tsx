// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4). The fields FilterSidebar and
// FilterDrawer share, so the two shells hold one markup: the listing's other parameters as hidden
// inputs, then every facet's FilterGroup, each in an AccordionItem. It draws no form: the shell
// that holds it owns the `<form>`, its `action` and its submit. A server component; the accordion
// and the groups are Base UI's parts and ours, which carry their own client parts.
// - Every group starts open. The accordion's triggers are buttons that do nothing before the page
//   has hydrated and never without JavaScript, so a closed group would be out of reach for a
//   visitor whose script has not loaded; an open one works as a plain form. A visitor who closes a
//   group has it closed until the page changes. (The usual alternative, opening only the groups with
//   something chosen, would hide whole facets from that visitor.)
// - A closed group still posts what is chosen in it: the accordion keeps its panels in the page
//   (`keepMounted`, Base UI's way: the panel stays, with `hidden`), and a hidden control is still a
//   control of the form. Without it Base UI would take a closed panel's checkboxes out of the page
//   and the form would send the filters without them.
// - An on/off filter (in stock, on sale) is one switch whose label says it all, so it is a plain row
//   between the sections and not a section of its own: an accordion titled "In stock" over a
//   switch labelled "In stock" would say it twice and hide one control behind another. It keeps its
//   place in the facets' order. The other kinds hide their legend (`hideLegend`) because the
//   section's trigger already shows the name; the legend stays for assistive technology.
// - `open="first"` (T84's `accordion` listing layout) closes every group but the first. Base UI's
//   accordion cannot do that without scripts (a closed panel's trigger is a button that needs
//   them), so those groups are native disclosures (`<details>` and `<summary>`, as the FAQ's):
//   they open with the keyboard and without JavaScript, and a closed one's fields are still the
//   form's, so it posts what is chosen in it. A closed group with something chosen in it starts
//   open, so a visitor sees why the listing is filtered.
import type { Messages } from "@shopblok/i18n";
import type { FacetGroup, QueryParam } from "@shopblok/registry/contracts";
import { AccordionItem } from "@shopblok/ui/molecules/accordion-item";
import { FilterGroup } from "@shopblok/ui/molecules/filter-group";
import { Accordion } from "@shopblok/ui/primitives/accordion";
import { ChevronDownIcon } from "lucide-react";

type FilterFieldsProps = {
  groups: FacetGroup[];
  /** The listing's other parameters (the sort), kept as hidden inputs. */
  params: QueryParam[];
  /** The wording, from the catalog's `molecules.filterGroup`. */
  copy: Messages["molecules"]["filterGroup"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The level of the headings the sections sit in, under the shell's own title. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Which groups start open: every one (the default), or the first and any with a choice in it. */
  open?: "all" | "first";
};

/** Whether anything is chosen in a group. */
function hasChoice(group: FacetGroup): boolean {
  if (group.kind === "checkbox" || group.kind === "swatch")
    return group.options.some((option) => option.selected);
  return group.kind === "range" ? group.selected !== undefined : group.selected;
}

/** The groups as native disclosures, the first open (T84's `accordion` layout). */
function DisclosureFields({
  groups,
  copy,
  locale,
}: Pick<FilterFieldsProps, "groups" | "copy" | "locale">) {
  const first = groups.find((group) => group.kind !== "toggle");
  return (
    <div
      data-slot="filter-fields"
      data-open="first"
      className="flex w-full flex-col"
    >
      {groups.map((group) =>
        group.kind === "toggle" ? (
          <div
            key={group.id}
            data-slot="filter-toggle-row"
            className="border-b py-1"
          >
            <FilterGroup facet={group} copy={copy} locale={locale} />
          </div>
        ) : (
          <details
            key={group.id}
            data-slot="filter-disclosure"
            open={group === first || hasChoice(group)}
            className="group/filter not-last:border-b"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 rounded-md py-4 text-start text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 wrap-anywhere">{group.label}</span>
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open/filter:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="pb-4 text-sm">
              <FilterGroup
                facet={group}
                copy={copy}
                locale={locale}
                hideLegend
              />
            </div>
          </details>
        ),
      )}
    </div>
  );
}

function FilterFields({
  groups,
  params,
  copy,
  locale,
  headingLevel = 3,
  open = "all",
}: FilterFieldsProps) {
  if (open === "first")
    return (
      <>
        {params.map((param, index) => (
          <input
            key={`${param.name}-${index}`}
            type="hidden"
            name={param.name}
            value={param.value}
          />
        ))}
        <DisclosureFields groups={groups} copy={copy} locale={locale} />
      </>
    );
  return (
    <>
      {params.map((param, index) => (
        <input
          key={`${param.name}-${index}`}
          type="hidden"
          name={param.name}
          value={param.value}
        />
      ))}
      <Accordion
        multiple
        keepMounted
        defaultValue={groups
          .filter((group) => group.kind !== "toggle")
          .map((group) => group.id)}
        data-slot="filter-fields"
      >
        {groups.map((group) =>
          group.kind === "toggle" ? (
            <div
              key={group.id}
              data-slot="filter-toggle-row"
              className="border-b py-1"
            >
              <FilterGroup facet={group} copy={copy} locale={locale} />
            </div>
          ) : (
            <AccordionItem
              key={group.id}
              value={group.id}
              title={group.label}
              headingLevel={headingLevel}
            >
              <FilterGroup
                facet={group}
                copy={copy}
                locale={locale}
                hideLegend
              />
            </AccordionItem>
          ),
        )}
      </Accordion>
    </>
  );
}

export { FilterFields };
export type { FilterFieldsProps };
