import type {
  Category,
  FacetGroup,
  Image,
  ProductBadge,
  ProductCard,
  ProductDetail,
  ProductVariant,
  RatingSummary,
  Review,
  SearchResult,
  Stock,
} from "@shopblok/registry/contracts";
import type { Context } from "../context";
import {
  type BadgeKind,
  type CategoryNode,
  categoryTree,
  facetData,
  hoodie,
  palette,
  productSpec,
  productSpecs,
  type ProductSpec,
  ratingDistribution,
  reviewMeta,
} from "../data/catalog";
import { fixtureImage } from "../images";

function badge(ctx: Context, kind: BadgeKind): ProductBadge {
  return kind === "custom" ? { kind, label: ctx.copy.customBadge } : { kind };
}

/** A product's pictures: the front, then (when it has two) the back, which a card shows on hover. */
export function productImages(ctx: Context, spec: ProductSpec): Image[] {
  const title = ctx.productTitle(spec.handle);
  return spec.images.map(({ seed, ratio }, index) =>
    fixtureImage({
      seed,
      ratio,
      alt: index === 0 ? ctx.copy.imageAlt.front(title) : ctx.copy.imageAlt.back(title),
    }),
  );
}

function productCard(ctx: Context, spec: ProductSpec): ProductCard {
  return {
    id: spec.id,
    handle: spec.handle,
    title: ctx.productTitle(spec.handle),
    href: ctx.href(`/products/${spec.handle}`),
    images: productImages(ctx, spec),
    price: {
      price: ctx.price(spec.prices),
      ...(spec.compareAt !== undefined && { compareAt: ctx.price(spec.compareAt) }),
      varies: spec.varies ?? false,
    },
    badges: spec.badges.map((kind) => badge(ctx, kind)),
    ...(spec.rating !== undefined && { rating: { ...spec.rating } }),
    swatches: spec.colours.map(({ key, available }) => ({
      id: `colour-${key}`,
      label: ctx.colourName(key),
      hex: palette[key],
      available,
    })),
    // One variant for each colour in each size.
    variantCount: spec.colours.length * spec.sizes,
    stock: { ...spec.stock },
  };
}

export function buildProducts(ctx: Context): ProductCard[] {
  return productSpecs.map((spec) => productCard(ctx, spec));
}

export function buildRatingSummary(): RatingSummary {
  const count = ratingDistribution.reduce((sum, stars) => sum + stars, 0);
  const points = ratingDistribution.reduce((sum, stars, index) => sum + stars * (5 - index), 0);
  return {
    average: Math.round((points / count) * 10) / 10,
    count,
    distribution: ratingDistribution.map((stars, index) => ({ stars: 5 - index, count: stars })),
  };
}

/** The Heritage Hoodie's page: four colours in six sizes, 24 variants, some of them sold out. */
export function buildProduct(ctx: Context): ProductDetail {
  const spec = productSpec("heritage-hoodie");
  const title = ctx.productTitle("heritage-hoodie");
  const sizeId = (size: string) => `size-${size.toLowerCase()}`;
  const variants = hoodie.colours.flatMap((colour) =>
    hoodie.sizes.map((size): ProductVariant => {
      const soldOut = hoodie.unavailable(colour, size);
      const isLow = colour === hoodie.low.colour && size === hoodie.low.size;
      const stock: Stock = soldOut
        ? { status: "out", quantity: 0 }
        : isLow
          ? { status: "low", quantity: hoodie.low.quantity }
          : { status: "in-stock" };
      return {
        id: `var_heritage_hoodie_${colour}_${size.toLowerCase()}`,
        title: `${ctx.colourName(colour)} / ${size}`,
        sku: `HH-${colour.slice(0, 3).toUpperCase()}-${size}`,
        options: { colour: `colour-${colour}`, size: sizeId(size) },
        price: ctx.price(spec.prices),
        available: !soldOut,
        stock,
      };
    }),
  );
  return {
    id: spec.id,
    handle: spec.handle,
    title,
    description: `${ctx.ds.ordinary.productDescription} ${ctx.copy.hoodieDetails}`,
    href: ctx.href(`/products/${spec.handle}`),
    breadcrumbs: [
      { label: ctx.copy.home, href: ctx.root },
      ...hoodie.category.map((handle, index) => ({
        label: ctx.copy.categories[handle],
        href: ctx.categoryHref(...hoodie.category.slice(0, index + 1)),
      })),
    ],
    media: hoodie.media.map(({ seed, ratio, colour }) => ({
      ...fixtureImage({
        seed,
        ratio,
        alt:
          colour === undefined
            ? ctx.copy.imageAlt.front(title)
            : ctx.copy.imageAlt.colour(title, ctx.colourName(colour)),
      }),
      ...(colour !== undefined && { optionValueIds: [`colour-${colour}`] }),
    })),
    options: [
      {
        id: "colour",
        title: ctx.copy.options.colour,
        kind: "color",
        values: hoodie.colours.map((colour) => ({
          id: `colour-${colour}`,
          label: ctx.colourName(colour),
          hex: palette[colour],
        })),
      },
      {
        id: "size",
        title: ctx.copy.options.size,
        kind: "size",
        values: hoodie.sizes.map((size) => ({ id: sizeId(size), label: size })),
      },
    ],
    variants,
    price: { price: ctx.price(spec.prices), varies: false },
    badges: spec.badges.map((kind) => badge(ctx, kind)),
    rating: buildRatingSummary(),
  };
}

export function buildCategories(ctx: Context): Category[] {
  const convert = (node: CategoryNode, path: string[]): Category => {
    const here = [...path, node.handle];
    return {
      id: node.id,
      title: ctx.copy.categories[node.handle],
      handle: node.handle,
      href: ctx.categoryHref(...here),
      children: node.children.map((child) => convert(child, here)),
    };
  };
  return categoryTree.map((node) => convert(node, []));
}

export function buildReviews(ctx: Context): Review[] {
  return reviewMeta.map((meta, index) => {
    const text = ctx.copy.reviews[index];
    if (text === undefined) throw new Error(`The ${ctx.locale} copy has no review ${index + 1}`);
    return {
      id: meta.id,
      author: text.author,
      rating: meta.rating,
      ...(text.title !== undefined && { title: text.title }),
      body: text.body,
      createdAt: meta.createdAt,
      verified: meta.verified,
    };
  });
}

/** "hoodie": the first four cards are hoodies, of the 14 matches. */
export function buildSearch(ctx: Context, products: ProductCard[]): SearchResult {
  const [women, men] = ctx.copy.search.categories;
  return {
    query: ctx.copy.search.query,
    total: 14,
    products: products.slice(0, 4),
    categories: [
      { label: women, href: ctx.categoryHref("women", "clothing", "hoodies") },
      { label: men, href: ctx.categoryHref("men", "clothing", "hoodies") },
    ],
    suggestions: [...ctx.copy.search.suggestions],
  };
}

export function buildFacets(ctx: Context): FacetGroup[] {
  const { copy } = ctx;
  const price = facetData.price[ctx.currency];
  return [
    {
      kind: "checkbox",
      id: "category",
      label: copy.facets.category,
      options: facetData.categories.map(({ handle, count, selected }) => ({
        value: handle,
        label: copy.categories[handle],
        count,
        selected,
      })),
    },
    {
      kind: "swatch",
      id: "colour",
      label: copy.facets.colour,
      options: facetData.colours.map(({ key, count, selected }) => ({
        value: key,
        label: ctx.colourName(key),
        count,
        selected,
        hex: palette[key],
      })),
    },
    {
      kind: "checkbox",
      id: "size",
      label: copy.facets.size,
      options: facetData.sizes.map(({ size, count, selected }) => ({
        value: size.toLowerCase(),
        label: size,
        count,
        selected,
      })),
    },
    {
      kind: "range",
      id: "price",
      label: copy.facets.price,
      currencyCode: ctx.currency,
      min: price.min,
      max: price.max,
      selected: { ...price.selected },
    },
    {
      kind: "toggle",
      id: "in-stock",
      label: copy.facets.inStock,
      ...facetData.inStock,
    },
    {
      kind: "toggle",
      id: "on-sale",
      label: copy.facets.onSale,
      ...facetData.onSale,
    },
  ];
}
