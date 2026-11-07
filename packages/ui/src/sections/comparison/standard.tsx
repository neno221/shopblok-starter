// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `comparison`, D79). Two to four handpicked
// products side by side in a table: a column each, headed by its picture and its name (a link to its
// page); a row for the price in the market's currency, one for each of the products' options (its
// values, in the market's language) and one for each `metadata` key the editor named, under the
// editor's label. A product without a value shows a dash, read as "Not specified". The table is
// captioned by the heading. On a narrow screen it scrolls sideways in its own box, which takes the
// focus so the keyboard can scroll it too (the size guide's pattern); the box is a group named by
// the caption, not a region, so two comparisons with one heading are not two landmarks of one
// name. A server component. T82 moved the table to `parts.tsx`, which `highlight` shares; the first
// member draws no pick.
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { ComparisonTable, type ComparisonSectionProps } from "./parts";

function ComparisonStandard(props: ComparisonSectionProps) {
  const { settings, className } = props;
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="comparison-section"
      className={className}
    >
      <ComparisonTable {...props} pick={undefined} />
    </SectionFrame>
  );
}

export { ComparisonStandard };
export type { ComparisonSectionProps };
