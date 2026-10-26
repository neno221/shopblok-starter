import type { CurrencyCode, Image, Money } from "@shopblok/registry/contracts";
import type { Money as MoneyDto } from "../medusa/products";

// What the mappers share (D41): the data layer's DTOs become the registry's view models here, and
// nowhere else. Every mapper is pure: the market's URLs come in as functions, so a test feeds any.

/** Medusa's lowercase currency as the contracts have it (ISO 4217, upper case). */
export function toCurrencyCode(code: string): CurrencyCode {
  return code.toUpperCase();
}

/** An amount in major units, as Medusa gives it (never ÷100). */
export function toMoney(money: MoneyDto): Money {
  return { amount: money.amount, currencyCode: toCurrencyCode(money.currencyCode) };
}

/**
 * The size a Medusa image is drawn at. Medusa stores no width or height, and the contracts need
 * both for the space a picture reserves (CLS): the catalog's pictures are 3:4 portraits, the
 * fixtures' product ratio (`imageRatios["3:4"]`). An image of another shape is fitted into it by the
 * component's `object-fit`.
 */
export const PRODUCT_IMAGE_SIZE = { width: 1200, height: 1600 } as const;

/** A neutral 3:4 picture for a product with none, so a card or a gallery keeps its shape. */
export const PLACEHOLDER_IMAGE: Image = {
  src:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="#e7e5e4"/></svg>',
    ),
  alt: "",
  ...PRODUCT_IMAGE_SIZE,
};

/** A product picture: a URL Medusa answered with, or the placeholder for a URL that is not one. */
export function toProductImage(url: string, alt: string): Image {
  return /^(?:https?:\/\/|\/(?!\/))/.test(url)
    ? { src: url, alt, ...PRODUCT_IMAGE_SIZE }
    : PLACEHOLDER_IMAGE;
}

/** The URLs a mapper needs, built by the caller for its market (`buildPublicUrl`). */
export type Hrefs = {
  product: (handle: string) => string;
  category: (handle: string) => string;
  collection?: (handle: string) => string;
};
