// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). The two-tier footer: a main
// tier with the logo and the social links on a row, and the columns and the newsletter under them
// (as in the multi-column footer), then a bar under a rule with the legal links, the payment marks,
// the market switcher and the copyright. The switcher is in the bar at every width and keeps its two
// forms, a popover from `md` (768 px) and a bottom sheet below it, so the sheet SPEC §9.4 asks of
// every variant is one tap from the bar on a phone as well; no ancestor of it is `hidden`, so the
// one trigger the width shows is on the screen at every width. The bar is always drawn: it holds
// the copyright line, which every shop has.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CONTAINER,
  FooterColumns,
  FooterCopyright,
  FooterLegal,
  FooterLogo,
  FooterNewsletter,
  FooterPayments,
  FooterSocial,
  FooterSwitcher,
  footerClass,
  type FooterProps,
} from "./parts";

function FooterTwoTier(props: FooterProps) {
  const columns = props.columns.length > 0;
  const newsletter = props.newsletter !== undefined;
  return (
    <footer data-slot="footer" data-variant="two-tier" className={footerClass(props.className)}>
      <div data-slot="footer-main" className={cn(CONTAINER, "flex flex-col gap-10 py-10 lg:py-12")}>
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <FooterLogo footer={props} />
          <FooterSocial footer={props} />
        </div>
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
      </div>
      <div data-slot="footer-bar" className="border-t">
        <div
          className={cn(
            CONTAINER,
            "flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-4",
          )}
        >
          <FooterLegal footer={props} />
          <FooterPayments footer={props} />
          <FooterSwitcher footer={props} />
          <FooterCopyright footer={props} className="basis-full" />
        </div>
      </div>
    </footer>
  );
}

export { FooterTwoTier };
export type { FooterProps };
