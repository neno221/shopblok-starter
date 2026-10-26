// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4). What the buy box and the quick
// view work out from a product and the options chosen so far, kept apart from the components so
// that both read the same rules: which options are still missing, which variant the choice names
// (only once every option has a value), the price and the stock to show for it, and the pictures'
// `selectedValueIds`, and the sticky bar's content (T49). `useChosenSelection`
// (`use-chosen-selection.ts`, apart so a server page can import these rules without a hook) keeps
// the choice in state, starting from the `selection` a page passes, and follows that prop when it
// changes (the URL's back and forward, SPEC §8.4's
// two-way sync) with React's "storing information from previous renders" pattern: the previous prop
// is kept in state and compared during render, so there is no effect and no frame drawn with the
// old choice. The comparison is by content, not by identity, so a parent that builds `selection`
// again on every render (a server component's props arrive as new objects) does not throw away the
// shopper's choice. Nothing here reads a catalog: the words come from `@shopblok/i18n/format` and
// the copy the component was given, so a client chunk that imports this file takes no catalog.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type {
  MobileStickyATC,
  PriceSummary,
  ProductDetail,
  ProductOption,
  ProductVariant,
  VariantSelection,
} from "@shopblok/registry/contracts";
import type { StockStatus } from "@shopblok/ui/atoms/stock-indicator";

/** Whether two choices name the same value for the same options, in whatever order they list them. */
export function sameSelection(a: VariantSelection, b: VariantSelection): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/** Whether the choice holds a value that the option really has. */
function hasValue(option: ProductOption, chosen: VariantSelection): boolean {
  const valueId = chosen[option.id];
  return valueId !== undefined && option.values.some((value) => value.id === valueId);
}

/** The options that have no value yet, in the product's order. */
export function missingOptions(
  product: Pick<ProductDetail, "options">,
  chosen: VariantSelection,
): ProductOption[] {
  return product.options.filter((option) => !hasValue(option, chosen));
}

/**
 * The variant the choice names: one value of every option, or nothing while an option is missing
 * (and nothing for a combination the product does not make).
 */
export function variantFor(
  product: Pick<ProductDetail, "options" | "variants">,
  chosen: VariantSelection,
): ProductVariant | undefined {
  if (missingOptions(product, chosen).length > 0) return undefined;
  return product.variants.find((variant) =>
    product.options.every((option) => variant.options[option.id] === chosen[option.id]),
  );
}

/** The values chosen, in the options' order: what the gallery needs to show the right picture. */
export function chosenValueIds(
  product: Pick<ProductDetail, "options">,
  chosen: VariantSelection,
): string[] {
  return product.options.flatMap((option) =>
    hasValue(option, chosen) ? [chosen[option.id] as string] : [],
  );
}

/** The chosen variant's price (and its compare-at), or the product's own, which may say "from". */
export function priceFor(
  product: Pick<ProductDetail, "price">,
  variant: ProductVariant | undefined,
): PriceSummary {
  if (variant === undefined) return product.price;
  return {
    price: variant.price,
    ...(variant.compareAt !== undefined && { compareAt: variant.compareAt }),
    varies: false,
  };
}

/**
 * What the stock indicator says for a variant. A variant that cannot be bought is out whatever its
 * count says, so the line never contradicts the button; a low count with no number is shown as in
 * stock, because the words ("Only 3 left") need the number.
 */
export function stockFor(
  variant: ProductVariant,
  copy: Messages["atoms"]["stock"],
  locale: string,
): { status: StockStatus; text: string } {
  const { stock } = variant;
  if (!variant.available || stock.status === "out") return { status: "out", text: copy.outOfStock };
  if (stock.status === "low" && stock.quantity !== undefined)
    return { status: "low", text: formatMessage(copy.low, { count: stock.quantity }, locale) };
  return { status: "in-stock", text: copy.inStock };
}

/**
 * The sticky bar for a choice (T49): the product's first picture, title and price, the chosen
 * values' labels in the options' order, and whether the button adds (`ready`), asks for an option
 * (`incomplete`) or names a variant that cannot be bought (`sold-out`). The page's server draws it
 * for the default choice and the buy box island again for each choice.
 */
export function stickyFor(
  product: Pick<ProductDetail, "title" | "media" | "options" | "variants" | "price">,
  chosen: VariantSelection,
): MobileStickyATC {
  const variant = variantFor(product, chosen);
  const choice = product.options.flatMap((option) => {
    const value = option.values.find((each) => each.id === chosen[option.id]);
    return value === undefined ? [] : [value.label];
  });
  const [first] = product.media;
  // The bar's picture is a plain image: which values it shows is the gallery's business.
  const image = first === undefined ? undefined : (({ optionValueIds: _, ...rest }) => rest)(first);
  return {
    title: product.title,
    ...(image === undefined ? {} : { image }),
    price: priceFor(product, variant),
    choice,
    status:
      missingOptions(product, chosen).length > 0
        ? "incomplete"
        : variant?.available === true
          ? "ready"
          : "sold-out",
  };
}
