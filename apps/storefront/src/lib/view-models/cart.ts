import type { Cart, CartLine, LineOption } from "@shopblok/registry/contracts";
import type { CartDto } from "../medusa/cart";
import type { ProductDto } from "../medusa/products";
import { toCurrencyCode, toMoney, toProductImage, type Hrefs } from "./common";

/**
 * A cart as CartDrawer, QuickCartDropdown and the cart page take it (D60's `/next/cart`). The lines'
 * options, pictures and stock come from the products (`readProductsByIds` in the cart's region and
 * the market's locale): the Store API's cart cannot select a line's variant options, and a line's
 * `variant_title` is the default language's. A line whose product is gone keeps its title and
 * price, with no options or picture.
 */
export function toCart(
  cart: CartDto,
  products: readonly ProductDto[],
  hrefs: Pick<Hrefs, "product">,
): Cart {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = cart.lines.map((line): CartLine => {
    const product = byId.get(line.productId);
    const variant = product?.variants.find((candidate) => candidate.id === line.variantId);
    const options: LineOption[] =
      product === undefined || variant === undefined
        ? []
        : product.options.flatMap((option) => {
            const value = option.values.find(
              (candidate) => candidate.id === variant.options[option.id],
            );
            return value === undefined ? [] : [{ option: option.title, value: value.value }];
          });
    const picture =
      variant?.thumbnail ?? line.thumbnail ?? product?.thumbnail ?? product?.images[0]?.url;
    const stock = variant?.stock ?? { status: "in-stock" as const };
    return {
      id: line.id,
      productId: line.productId,
      variantId: line.variantId,
      title: product?.title ?? line.title,
      href: hrefs.product(line.productHandle),
      ...(picture ? { image: toProductImage(picture, product?.title ?? line.title) } : {}),
      options,
      quantity: line.quantity,
      ...(stock.status === "low" && stock.quantity !== undefined
        ? { maxQuantity: Math.max(line.quantity, stock.quantity) }
        : {}),
      unitPrice: toMoney(line.unitPrice),
      ...(line.compareAtUnitPrice === null
        ? {}
        : { compareAtUnitPrice: toMoney(line.compareAtUnitPrice) }),
      total: toMoney(line.total),
      stock,
    };
  });
  return {
    id: cart.id,
    currencyCode: toCurrencyCode(cart.currencyCode),
    lines,
    itemCount: cart.itemCount,
    subtotal: toMoney(cart.subtotal),
    discountTotal: toMoney(cart.discountTotal),
    ...(cart.shippingTotal === null ? {} : { shippingTotal: toMoney(cart.shippingTotal) }),
    taxTotal: toMoney(cart.taxTotal),
    total: toMoney(cart.total),
    promoCodes: cart.promoCodes.map((promo) => ({
      code: promo.code,
      ...(promo.discount === null ? {} : { discount: toMoney(promo.discount) }),
    })),
  };
}
