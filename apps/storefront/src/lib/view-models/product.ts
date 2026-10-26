import type {
  ColorSwatch,
  Link,
  PriceSummary,
  ProductBadge,
  ProductCard,
  ProductDetail,
  ProductOption,
  ProductVariant,
  Stock,
} from "@shopblok/registry/contracts";
import type { ProductDto, ProductOptionDto, ProductVariantDto } from "../medusa/products";
import { PLACEHOLDER_IMAGE, toMoney, toProductImage, type Hrefs } from "./common";

// A product DTO as ProductCard (D46) and ProductDetail (D61) take it.

type PricedVariant = ProductVariantDto & { price: NonNullable<ProductVariantDto["price"]> };

const priced = (variants: readonly ProductVariantDto[]): PricedVariant[] =>
  variants.filter((variant): variant is PricedVariant => variant.price !== null);

// Medusa has no kind for an option, so its title says: the words for colour and size in the four
// catalogs' languages, compared without case or accents. Any other title is drawn as pills.
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const COLOR_TITLES = new Set(["color", "colour", "farbe", "couleur", "χρωμα"]);
const SIZE_TITLES = new Set(["size", "große", "grosse", "taille", "μεγεθος"]);

export function optionKind(title: string): ProductOption["kind"] {
  const key = fold(title);
  if (COLOR_TITLES.has(key)) return "color";
  if (SIZE_TITLES.has(key)) return "size";
  return "other";
}

/**
 * The price a card and a buy box show: the cheapest priced variant, the price it replaces when that
 * variant is on sale, and whether the variants differ. `null` when no variant has a price in the
 * region: such a product is not shown.
 */
export function toPriceSummary(variants: readonly ProductVariantDto[]): PriceSummary | null {
  const list = priced(variants);
  const [cheapest] = [...list].sort((a, b) => a.price.amount - b.price.amount);
  if (cheapest === undefined) return null;
  return {
    price: toMoney(cheapest.price),
    ...(cheapest.compareAt === null ? {} : { compareAt: toMoney(cheapest.compareAt) }),
    varies: new Set(list.map((variant) => variant.price.amount)).size > 1,
  };
}

/** The product's stock: "out" when no variant can be bought, "low" when every one that can is low. */
export function toProductStock(variants: readonly ProductVariantDto[]): Stock {
  const available = variants.filter((variant) => variant.available);
  if (available.length === 0) return { status: "out" };
  if (available.every((variant) => variant.stock.status === "low")) {
    const quantity = available.reduce((sum, variant) => sum + (variant.stock.quantity ?? 0), 0);
    return { status: "low", ...(quantity > 0 ? { quantity } : {}) };
  }
  return { status: "in-stock" };
}

const toBadges = (summary: PriceSummary): ProductBadge[] =>
  summary.compareAt === undefined ? [] : [{ kind: "sale" }];

function toSwatches(product: ProductDto): ColorSwatch[] {
  const colour = product.options.find((option) => optionKind(option.title) === "color");
  if (colour === undefined) return [];
  return colour.values.map((value) => ({
    id: value.id,
    label: value.value,
    available: product.variants.some(
      (variant) => variant.available && variant.options[colour.id] === value.id,
    ),
  }));
}

function toImages(product: ProductDto) {
  const urls = product.images.length > 0 ? product.images.map((image) => image.url) : [];
  if (urls.length === 0 && product.thumbnail !== null) urls.push(product.thumbnail);
  // The title is the alternative text: the picture shows the product the card names.
  return urls.map((url) => toProductImage(url, product.title));
}

/** A product as ProductCard takes it, or `null` when it has no price in the region. */
export function toProductCard(
  product: ProductDto,
  hrefs: Pick<Hrefs, "product">,
): ProductCard | null {
  const price = toPriceSummary(product.variants);
  if (price === null) return null;
  const images = toImages(product).slice(0, 2);
  const variants = priced(product.variants);
  const [only] = variants;
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    href: hrefs.product(product.handle),
    images: images.length > 0 ? images : [{ ...PLACEHOLDER_IMAGE }],
    price,
    badges: toBadges(price),
    swatches: toSwatches(product),
    variantCount: variants.length,
    ...(variants.length === 1 && only !== undefined ? { variantId: only.id } : {}),
    stock: toProductStock(product.variants),
  };
}

function toOptions(options: readonly ProductOptionDto[]): ProductOption[] {
  return options
    .filter((option) => option.values.length > 0)
    .map((option) => ({
      id: option.id,
      title: option.title,
      kind: optionKind(option.title),
      values: option.values.map((value) => ({ id: value.id, label: value.value })),
    }));
}

export type ProductDetailContext = {
  hrefs: Pick<Hrefs, "product" | "category">;
  /** The trail before the product: the home page, at least. */
  home: Link;
};

/**
 * A product page's data (D61): every priced variant that names one value of each option, the
 * gallery (the placeholder when Medusa has no picture), and breadcrumbs through the first
 * category. `null` when no variant can be shown, which the page answers with a 404.
 */
export function toProductDetail(
  product: ProductDto,
  { hrefs, home }: ProductDetailContext,
): ProductDetail | null {
  const options = toOptions(product.options);
  const valueIds = new Map(
    options.map((option) => [option.id, new Set(option.values.map((v) => v.id))]),
  );
  const variants: ProductVariant[] = priced(product.variants)
    .filter(
      (variant) =>
        Object.keys(variant.options).length === options.length &&
        Object.entries(variant.options).every(([option, value]) =>
          valueIds.get(option)?.has(value),
        ),
    )
    .map((variant) => ({
      id: variant.id,
      title: variant.title || product.title,
      ...(variant.sku === null ? {} : { sku: variant.sku }),
      options: variant.options,
      price: toMoney(variant.price),
      ...(variant.compareAt === null ? {} : { compareAt: toMoney(variant.compareAt) }),
      available: variant.available,
      stock: variant.stock,
    }));
  const price = toPriceSummary(
    product.variants.filter((v) => variants.some((kept) => kept.id === v.id)),
  );
  if (variants.length === 0 || price === null) return null;
  const media = toImages(product);
  const [category] = product.categories;
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    href: hrefs.product(product.handle),
    breadcrumbs: [
      home,
      ...(category === undefined
        ? []
        : [{ label: category.name, href: hrefs.category(category.handle) }]),
    ],
    media: media.length > 0 ? media : [{ ...PLACEHOLDER_IMAGE }],
    options,
    variants,
    price,
    badges: toBadges(price),
  };
}
