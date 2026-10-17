// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). The big wordmark footer: the
// logo, the columns and the newsletter as the multi-column footer has them, the bottom row, and then
// the store's name set very large across the footer's width. The wordmark repeats the logo's name, so
// it is hidden from assistive technology (`aria-hidden`), is not a link, and takes no focus: a screen
// reader meets the name once, in the logo link. It is sized in container query units, so it scales
// with the footer's own width and not the window's: its wrapper is the `@container` and the text is a
// child of it (an element cannot query itself). The size is the one that makes the name fill about
// nine tenths of the width on one line, estimated from the letters (Inter Bold: 0.55 em for a letter,
// 0.7 em for a capital, 0.28 em for a space), no larger than 22 cqw and no smaller than 8 cqw. A short
// name is therefore very large and a long one smaller; one that is still longer than the row at 8 cqw
// wraps at its spaces, and a word longer than the box breaks (`wrap-anywhere`), so nothing is wider
// than the page (375 px).
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

/** The width of a name in `em` at Inter Bold, estimated: a capital is wider than a small letter. */
function nameWidth(storeName: string): number {
  let width = 0;
  for (const letter of storeName) {
    if (letter === " ") width += 0.28;
    else width += letter.toLowerCase() === letter ? 0.55 : 0.7;
  }
  return Math.max(width, 0.55);
}

/** The wordmark's size in `cqw`: the name fills 90 % of the width on one line, between 8 and 22. */
function wordmarkSize(storeName: string): number {
  return Math.round(Math.min(22, Math.max(8, 90 / nameWidth(storeName))) * 10) / 10;
}

function FooterWordmark(props: FooterProps) {
  const columns = props.columns.length > 0;
  const newsletter = props.newsletter !== undefined;
  return (
    <footer data-slot="footer" data-variant="wordmark" className={footerClass(props.className)}>
      <div className={cn(CONTAINER, "flex flex-col gap-10 pt-10 lg:pt-12")}>
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
      <div
        aria-hidden="true"
        data-slot="footer-wordmark"
        className={cn(CONTAINER, "@container pt-6 pb-4 lg:pt-8")}
      >
        <p
          className="m-0 pb-[0.1em] leading-[0.95] font-bold tracking-tighter wrap-anywhere text-foreground"
          style={{ fontSize: `${wordmarkSize(props.storeName)}cqw` }}
        >
          {props.storeName}
        </p>
      </div>
    </footer>
  );
}

export { FooterWordmark, wordmarkSize };
export type { FooterProps };
