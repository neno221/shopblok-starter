import { catalogs } from "@shopblok/i18n";
import { Button } from "@shopblok/ui/atoms/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@shopblok/ui/primitives/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shopblok/ui/primitives/sheet";
import { OverlayBox } from "../../../../../../design-system/components/overlay-box";
import { createContext } from "../../../../../../design-system/context";
import { requireDesignSystemLocale } from "../../../../../../design-system/gate";

const copy = catalogs.en.designSystem.overlayCheck;

// D44: a build fails if anything on this page reads the request (ADR 0004).
export const ensureStatic = "navigation";

// `/design-system/[locale]/checks/overlay-box` (T31, D45): not an entry, and not linked from the
// navigation. The `design-system` job opens it and measures that each open overlay lies inside its
// box: a sheet, which is `position: fixed` and pinned to an edge, and a popover, which Base UI
// places against its trigger. The molecules' and organisms' overlays (T33 on) are drawn the same
// way on their own frames.
export default async function OverlayBoxCheck() {
  const locale = await requireDesignSystemLocale();
  const { fixture } = createContext(locale);
  const { ordinary } = fixture;
  return (
    <article>
      <h1 className="text-3xl font-semibold">{copy.title}</h1>
      <p className="mt-2 max-w-prose">{copy.intro}</p>
      <h2 className="mt-8 mb-3 text-xl font-semibold">{copy.sheet}</h2>
      <OverlayBox name={copy.sheet}>
        <Sheet defaultOpen modal={false}>
          <SheetContent closeLabel={copy.close}>
            <SheetHeader>
              <SheetTitle>{ordinary.productName}</SheetTitle>
              <SheetDescription>{ordinary.productDescription}</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </OverlayBox>
      <h2 className="mt-8 mb-3 text-xl font-semibold">{copy.popover}</h2>
      <OverlayBox name={copy.popover} height={320}>
        <div className="p-6">
          <Popover defaultOpen modal={false}>
            <PopoverTrigger render={<Button variant="outline" />}>{ordinary.action}</PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>{ordinary.productName}</PopoverTitle>
                <PopoverDescription>{ordinary.helpText}</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
      </OverlayBox>
    </article>
  );
}
