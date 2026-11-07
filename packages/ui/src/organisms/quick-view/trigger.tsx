// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D101, D102). The quick view's
// trigger as a shop's listing card draws it, with none of the dialog's code: a GET form whose
// action is the product's page and whose one control is the 44 px "Quick view" button, named
// "Quick view: Heritage Hoodie" as the dialog's own trigger is (WCAG 2.5.3). Without scripts it is
// the way to the product page. With them, the shop's listing island catches its `submit` (the form's
// `data-quick-view` holds the product's handle), loads the dialog's module and the product on that
// first press, and opens the member the button names (`data-variant`, the family's root, D99), with
// focus back on this button when it closes. A server component: no state, no handler.
import { formatMessage } from "@shopblok/i18n/format";
import type { Messages } from "@shopblok/i18n";
import type { ProductCard, VariantOf } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";

type QuickViewTriggerProps = {
  product: Pick<ProductCard, "title" | "href" | "handle">;
  /** The `templates` global's quick view: the member the press opens. */
  variant: VariantOf<"quick-view">;
  copy: Pick<Messages["organisms"]["quickViewDialog"], "open" | "openLabel">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  className?: string;
};

function QuickViewTrigger({ product, variant, copy, locale, className }: QuickViewTriggerProps) {
  return (
    <form
      action={product.href}
      method="get"
      data-slot="quick-view-open"
      data-quick-view={product.handle}
      className={cn("relative z-10 flex flex-col", className)}
    >
      <Button
        type="submit"
        variant="outline"
        data-slot="quick-view-trigger"
        data-variant={variant}
        aria-label={formatMessage(copy.openLabel, { title: product.title }, locale)}
        className="w-full max-w-full wrap-anywhere"
      >
        {copy.open}
      </Button>
    </form>
  );
}

export { QuickViewTrigger };
export type { QuickViewTriggerProps };
