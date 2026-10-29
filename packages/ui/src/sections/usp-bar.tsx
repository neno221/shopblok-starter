// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `uspBar`, §9.5's "USP bar" gap). A shop's promises
// in a row: an icon from a fixed set (`USP_ICONS`) and a short title, with a line under it if the
// editor wrote one. One column on a phone, two from `sm`, and from `lg` up to four. The icons are
// decoration: the title says what each promise is. A server component.
import type { UspBarSection as UspBarSectionData, UspIcon } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  BadgeCheckIcon,
  GiftIcon,
  HeadsetIcon,
  LeafIcon,
  type LucideIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TruckIcon,
  ZapIcon,
} from "lucide-react";

/** The lucide icon each USP icon is drawn with. */
const icons: Record<UspIcon, LucideIcon> = {
  delivery: TruckIcon,
  returns: RotateCcwIcon,
  secure: ShieldCheckIcon,
  support: HeadsetIcon,
  sustainable: LeafIcon,
  gift: GiftIcon,
  quality: BadgeCheckIcon,
  fast: ZapIcon,
};

/** The columns from `lg` up: as many as there are items, at most four. */
const columns = ["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"] as const;

type UspBarSectionProps = UspBarSectionData & { className?: string };

function UspBarSection({ settings, items, className }: UspBarSectionProps) {
  return (
    <SectionFrame settings={settings} slot="usp-bar-section" className={className}>
      <ul
        className={cn(
          "grid grid-cols-1 gap-6 sm:grid-cols-2",
          columns[Math.min(items.length, 4) - 1],
        )}
      >
        {items.map((item) => {
          const Icon = icons[item.icon];
          return (
            <li
              key={`${item.icon} ${item.title}`}
              data-slot="usp-item"
              className="flex min-w-0 items-start gap-3"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-medium wrap-anywhere">{item.title}</p>
                {item.text === undefined ? null : (
                  <p className="text-sm text-muted-foreground wrap-anywhere">{item.text}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionFrame>
  );
}

export { UspBarSection, icons as uspIcons };
export type { UspBarSectionProps };
