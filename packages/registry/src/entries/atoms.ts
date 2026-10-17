import type { EntryInput } from "../types";

// SPEC §9.3's 32 atoms, in the navigation's order: the 17 from shadcn (T21), then the 15 of the
// commerce kit (T23). Each renders the export of `@shopblok/ui/atoms/{slug}` that it names.
const atom = <const Slug extends string, const Label extends string>(
  slug: Slug,
  label: Label,
  name: string,
) =>
  ({
    id: `atoms/${slug}`,
    group: "atoms",
    kind: "atom",
    label,
    component: { module: `@shopblok/ui/atoms/${slug}`, name },
  }) as const satisfies EntryInput;

export const atoms = [
  atom("button", "Button", "Button"),
  atom("input", "Input", "Input"),
  atom("textarea", "Textarea", "Textarea"),
  atom("select", "Select", "Select"),
  atom("native-select", "Native select", "NativeSelect"),
  atom("checkbox", "Checkbox", "Checkbox"),
  atom("radio-group", "Radio group", "RadioGroup"),
  atom("switch", "Switch", "Switch"),
  atom("label", "Label", "Label"),
  atom("badge", "Badge", "Badge"),
  atom("skeleton", "Skeleton", "Skeleton"),
  atom("spinner", "Spinner", "Spinner"),
  atom("avatar", "Avatar", "Avatar"),
  atom("separator", "Separator", "Separator"),
  atom("kbd", "Kbd", "Kbd"),
  atom("tooltip", "Tooltip", "Tooltip"),
  atom("progress", "Progress", "Progress"),
  atom("icon-button", "IconButton", "IconButton"),
  atom("link", "Link", "Link"),
  atom("chip", "Chip", "Chip"),
  atom("price", "Price", "Price"),
  atom("rating", "Rating", "Rating"),
  atom("swatch", "Swatch", "Swatch"),
  atom("size-pill", "SizePill", "SizePill"),
  atom("quantity-stepper", "QuantityStepper", "QuantityStepper"),
  atom("stock-indicator", "StockIndicator", "StockIndicator"),
  atom("visually-hidden", "VisuallyHidden", "VisuallyHidden"),
  atom("image", "Image", "Image"),
  atom("icon", "Icon", "Icon"),
  atom("logo", "Logo", "Logo"),
  atom("payment-icon", "PaymentIcon", "PaymentIcon"),
  atom("flag", "Flag", "Flag"),
] as const;
