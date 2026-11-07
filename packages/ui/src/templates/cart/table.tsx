// Ours (T85, SETUP.md "Cart variants (T85)"; M5 plan §1a, D99). The cart page's `table` member: from
// `md` the lines are a table (the product with its picture, options and stock, the price of one,
// the quantity with its forms, the line's total; one column header each), and the summary is under
// it at the end. Below `md` a table has no room, so the lines are the default member's list of
// CartLineItems there; each layout is `display: none` at the other's widths, so a reader meets one.
// Every form is CartLineItem's own (its parts, `molecules/cart-line-item.tsx`), posting to the same
// actions as the default member's, so the page works before any script runs. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import {
  CartLineControls,
  CartLineDetails,
  CartLineMedia,
  CartLineStatus,
  CartLineTotal,
  CartLineUnitPrice,
  cartLineWords,
} from "@shopblok/ui/molecules/cart-line-item";
import { CartFrame, CartFreeShipping, CartLines, CartSummary, type CartTemplateProps } from "./parts";

const head = "py-3 text-start text-sm leading-snug font-medium text-muted-foreground";

/** The lines as a table: a row per line, its parts in four cells. */
function CartTableRows({ props }: { props: CartTemplateProps }) {
  const { cart, copy, locale, updateAction, removeAction, prefetch, mainId = "main" } = props;
  const words = copy.page.table;
  return (
    <table data-slot="cart-table" className="w-full min-w-0 border-collapse max-md:hidden">
      <caption className="sr-only">{copy.page.lines}</caption>
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "pe-4")}>
            {words.product}
          </th>
          <th scope="col" className={cn(head, "px-4 text-end")}>
            {words.price}
          </th>
          <th scope="col" className={cn(head, "px-4")}>
            {words.quantity}
          </th>
          <th scope="col" className={cn(head, "ps-4 text-end")}>
            {words.total}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y border-b">
        {cart.lines.map((line) => {
          const lineWords = cartLineWords(line, copy.line, locale);
          const parts = { line, copy: copy.line, locale, words: lineWords };
          const titleId = `${mainId}-line-${line.id}`;
          return (
            <tr
              key={line.id}
              data-slot="cart-table-row"
              data-stock={line.stock.status}
              className="align-top"
            >
              <td className="py-4 pe-4">
                <div className="flex min-w-0 gap-4">
                  <CartLineMedia line={line} className="shrink-0" />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <CartLineDetails
                      line={line}
                      words={lineWords}
                      titleId={titleId}
                      heading="h2"
                      prefetch={prefetch}
                    />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <CartLineUnitPrice {...parts} className="min-h-11 items-center" />
              </td>
              <td className="px-4 py-4">
                <CartLineControls
                  {...parts}
                  updateAction={updateAction}
                  removeAction={removeAction}
                  className="flex-nowrap"
                />
                <CartLineStatus copy={copy.line} />
              </td>
              <td className="py-4 ps-4 text-end">
                <CartLineTotal
                  line={line}
                  copy={copy.line}
                  locale={locale}
                  className="flex min-h-11 items-center justify-end"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CartTable(props: CartTemplateProps) {
  return (
    <CartFrame props={props} variant="table">
      <div className="flex min-w-0 flex-col gap-6">
        <CartFreeShipping props={props} />
        <CartLines props={props} className="md:hidden" />
        <CartTableRows props={props} />
      </div>
      <CartSummary props={props} className="w-full md:ms-auto md:max-w-sm" />
    </CartFrame>
  );
}

export { CartTable };
