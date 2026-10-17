// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). The multi-column footer: the
// logo, then the columns of links side by side and the newsletter as the last column, then a bottom
// row with the social links, the market switcher, the legal links, the payment marks and the
// copyright. From `lg` (1024 px) the columns and the newsletter share a row (the newsletter at
// 22rem, which is narrow enough for its form to stack and wide enough for a field); below it the
// newsletter sits under the columns, and below `md` (768 px) the columns are an accordion
// (`parts.tsx`). A part the shop has none of is left out, with the row it was on: with no columns
// the newsletter takes a column of its own, and with neither the logo is followed by the bottom row.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CONTAINER,
  FooterBottom,
  FooterColumns,
  FooterLogo,
  FooterNewsletter,
  footerClass,
  type FooterProps,
} from "./parts";

function FooterMultiColumn(props: FooterProps) {
  const columns = props.columns.length > 0;
  const newsletter = props.newsletter !== undefined;
  return (
    <footer data-slot="footer" data-variant="multi-column" className={footerClass(props.className)}>
      <div className={cn(CONTAINER, "flex flex-col gap-10 py-10 lg:py-12")}>
        <FooterLogo footer={props} />
        {columns || newsletter ? (
          <div
            className={cn(
              "grid gap-x-12 gap-y-10",
              columns && newsletter && "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
            )}
          >
            <FooterColumns footer={props} />
            <FooterNewsletter footer={props} className={columns ? undefined : "max-w-xl"} />
          </div>
        ) : null}
        <FooterBottom footer={props} />
      </div>
    </footer>
  );
}

export { FooterMultiColumn };
export type { FooterProps };
