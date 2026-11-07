// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The USP bar's
// `strip` member: a thin row of small icons and titles, for under the header, centred on a wide
// screen and scrolling sideways on a phone when it does not fit (its own box, never the page). The
// editor's lines under the titles are left out: the strip is one line. The scrolling row is a list
// named "What we promise" that takes the focus, so the keyboard can scroll it too; the icons are
// decoration. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { uspIcons, type UspBarSectionProps } from "./standard";

function UspBarStrip({ settings, items, copy, className }: UspBarSectionProps) {
  return (
    <SectionFrame
      data-variant="strip"
      settings={settings}
      slot="usp-bar-section"
      className={className}
    >
      <ul
        data-slot="usp-strip"
        aria-label={copy?.uspBar.label}
        // Focusable only with its name: a scrolling list the keyboard can reach (axe's rule).
        tabIndex={copy === undefined ? undefined : 0}
        className={cn(
          "-mx-1 flex snap-x items-center gap-x-8 overflow-x-auto rounded-md px-1 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring",
          "md:justify-center",
        )}
      >
        {items.map((item) => {
          const Icon = uspIcons[item.icon];
          return (
            <li
              key={`${item.icon} ${item.title}`}
              data-slot="usp-item"
              className="flex shrink-0 snap-start items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {item.title}
            </li>
          );
        })}
      </ul>
    </SectionFrame>
  );
}

export { UspBarStrip };
