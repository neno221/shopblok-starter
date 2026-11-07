// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The comparison's
// `highlight` member: the first member's table with one product the editor marks as the pick, its
// column set apart (its cells on the muted fill between two rules in the primary colour) and named
// so: "Our pick" is in its column's header, so a screen reader says it with the product's name as
// it moves through that column's cells. The contract refuses this member without a pick among the
// table's products. A server component.
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { ComparisonTable, type ComparisonSectionProps } from "./parts";

function ComparisonHighlight(props: ComparisonSectionProps) {
  const { settings, className } = props;
  return (
    <SectionFrame
      data-variant="highlight"
      settings={settings}
      slot="comparison-section"
      className={className}
    >
      <ComparisonTable {...props} />
    </SectionFrame>
  );
}

export { ComparisonHighlight };
