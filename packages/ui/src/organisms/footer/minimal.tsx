// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). The minimal footer: one row,
// wrapping on a narrow screen. The copyright line is at the start; the legal links, the social links
// and the market switcher are at the end. It leaves out of the contract's fields the columns and the
// newsletter (a single row has no room for a list of links or a form, and a shop that picks it has
// chosen to say little), the payment marks (eight marks would be the row's widest part) and the
// logo (the copyright line names the store, and the header above already holds the logo). The
// fields are not lost: the same content drawn by another variant shows them. The social links keep
// their heading for a screen reader but not on the screen (`hideHeading`): a row has no room for a
// caption, and the icons are named "{store} on {network}" anyway.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CONTAINER,
  FooterCopyright,
  FooterLegal,
  FooterSocial,
  FooterSwitcher,
  footerClass,
  type FooterProps,
} from "./parts";

function FooterMinimal(props: FooterProps) {
  return (
    <footer data-slot="footer" data-variant="minimal" className={footerClass(props.className)}>
      <div
        className={cn(
          CONTAINER,
          "flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-6",
        )}
      >
        <FooterCopyright footer={props} />
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
          <FooterLegal footer={props} />
          <FooterSocial footer={props} hideHeading />
          <FooterSwitcher footer={props} />
        </div>
      </div>
    </footer>
  );
}

export { FooterMinimal };
export type { FooterProps };
