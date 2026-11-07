// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `statement`
// receipt: a document. The thanks (or the account's heading), the lines as a table (the product with
// its options, the quantity, the price of one from a container 32 rem wide, the line's total), the
// totals in a column at its end, then where it goes, how and how it is paid. It prints as it is, with
// no header, footer or navigation around it (`data-print="statement"`, the rule in `globals.css`)
// and without the way back to the shop. A server component.
import { formatMessage } from "@shopblok/i18n";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummaryRow } from "@shopblok/ui/molecules/order-summary-row";
import {
  ReceiptDelivery,
  ReceiptEnd,
  ReceiptPayment,
  ReceiptRoot,
  ReceiptShipping,
  ReceiptTop,
  type OrderConfirmationTemplateProps,
} from "./parts";

function OrderConfirmationStatement(props: OrderConfirmationTemplateProps) {
  const { order, summary, copy, locale, timeZone, mainId, as, account, className } = props;
  const words = copy.page.statement;
  const part = { order, copy, locale, timeZone };
  const cell = "px-2 py-3 align-top first:ps-0 last:pe-0";
  const head = "px-2 py-2 text-xs font-medium text-muted-foreground first:ps-0 last:pe-0";
  return (
    <ReceiptRoot
      variant="statement"
      mainId={mainId}
      as={as}
      account={account}
      className={cn(account === undefined && "max-w-4xl", className)}
    >
      <div data-print="statement" className="flex min-w-0 flex-col gap-8">
        <ReceiptTop props={props} />
        <div data-slot="order-statement" className="flex min-w-0 flex-col gap-4">
          <table className="w-full min-w-0 table-fixed border-collapse text-sm leading-snug">
            <caption className="mb-3 text-start text-base font-semibold wrap-anywhere">
              {words.caption}
            </caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className={cn(head, "text-start")}>
                  {words.product}
                </th>
                <th scope="col" className={cn(head, "w-20 text-end")}>
                  {words.quantity}
                </th>
                <th scope="col" className={cn(head, "hidden w-28 text-end @lg:table-cell")}>
                  {words.price}
                </th>
                <th scope="col" className={cn(head, "w-28 text-end")}>
                  {words.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} data-slot="order-statement-line" className="border-b">
                  <th scope="row" className={cn(cell, "text-start font-normal")}>
                    <span className="block font-medium wrap-anywhere">{line.title}</span>
                    {line.options.map((option, index) => (
                      <span
                        key={`${option.option}-${index}`}
                        className="block text-muted-foreground wrap-anywhere"
                      >
                        {formatMessage(copy.summary.option, option, locale)}
                      </span>
                    ))}
                  </th>
                  <td className={cn(cell, "text-end tabular-nums")}>{line.quantity}</td>
                  <td className={cn(cell, "hidden text-end @lg:table-cell")}>
                    <Price
                      size="sm"
                      amount={line.unitPrice.amount}
                      currency={line.unitPrice.currencyCode}
                      locale={locale}
                    />
                  </td>
                  <td className={cn(cell, "text-end font-medium")}>
                    <Price
                      size="sm"
                      amount={line.total.amount}
                      currency={line.total.currencyCode}
                      locale={locale}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl
            data-slot="order-summary-rows"
            className="ms-auto flex w-full max-w-xs min-w-0 flex-col pt-2"
          >
            {summary.rows.map((row, index) => (
              <OrderSummaryRow
                key={`${row.kind}-${index}`}
                {...row}
                copy={copy.rows}
                locale={locale}
              />
            ))}
          </dl>
        </div>
        <div className="grid min-w-0 gap-6 border-t pt-6 @2xl:grid-cols-3">
          <ReceiptShipping {...part} />
          <ReceiptDelivery {...part} />
          <ReceiptPayment {...part} />
        </div>
        <div className="flex min-w-0 flex-col print:hidden">
          <ReceiptEnd props={props} />
        </div>
      </div>
    </ReceiptRoot>
  );
}

export { OrderConfirmationStatement };
