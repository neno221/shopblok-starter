// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). The newsletter-first footer: a
// band across the footer's full width at the top, holding the signup on the page's own ground so it
// stands apart from the grey footer under it, then the logo and the columns, then the bottom row
// (`parts.tsx`). The form sits in a 42rem measure, centered, which is wide enough (over 28rem) for
// its field and button to share a row; below that width it stacks. Without a newsletter the band is
// left out, and what remains is the multi-column footer's body with the logo beside the columns
// from `lg` (1024 px) instead of above them, because nothing else shares their row.
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

function FooterNewsletterFirst(props: FooterProps) {
  const columns = props.columns.length > 0;
  return (
    <footer
      data-slot="footer"
      data-variant="newsletter-first"
      className={footerClass(props.className)}
    >
      {props.newsletter === undefined ? null : (
        <div data-slot="footer-band" className="border-b bg-background">
          <div className={cn(CONTAINER, "py-10 lg:py-12")}>
            <FooterNewsletter footer={props} className="mx-auto max-w-2xl" />
          </div>
        </div>
      )}
      <div className={cn(CONTAINER, "flex flex-col gap-10 py-10 lg:py-12")}>
        <div
          className={cn(
            "grid gap-x-12 gap-y-10",
            columns && "lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]",
          )}
        >
          <FooterLogo footer={props} />
          <FooterColumns footer={props} />
        </div>
        <FooterBottom footer={props} />
      </div>
    </footer>
  );
}

export { FooterNewsletterFirst };
export type { FooterProps };
