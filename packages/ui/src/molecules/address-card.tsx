// Ours (T34, D48, SETUP.md "Cart, checkout and account molecules (T34)"). A saved address as the
// address book and the checkout show it: an `<address>` with the lines of the country's own format
// (name, company, street, then its line of postal code, city and province, in its order and with
// its separators: "Brooklyn, NY 11215", "CH-8001 Zürich", `addressLines` in @shopblok/i18n), the
// country's name in the page's language, and the phone. The default marks are words in a badge
// ("Default shipping", "Default billing"), never colour alone. Two optional actions: an edit link
// (`editHref`, a link with a button's look and a 44 px box) and a remove button in a form of its
// own (`removeAction`, what a `<form action>` takes, M3's server action), each named for the
// address it belongs to ("Remove the address of Maria Georgiou, Nicosia"), so a list of cards
// has no two buttons with one name; the visible word comes first in the name (WCAG 2.5.3). While a
// remove is on its way (`removing`) the button keeps its place, says so, and cannot submit again
// (`aria-disabled`, `type="button"`, as NewsletterForm's does); an always-present `role="status"`
// region says it. The card is an `<article>` named by its name line. A server component: it only
// formats, and the action is the caller's.
import { addressLines, countryName, formatMessage, type Messages } from "@shopblok/i18n";
import type { Address } from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import NextLink from "next/link";
import { useId } from "react";
import type * as React from "react";

type AddressCardProps = Omit<React.ComponentProps<"article">, "children" | "aria-labelledby"> & {
  /** The address, in Medusa's fields (the `Address` contract). */
  address: Address;
  /** The wording, from the catalog's `molecules.addressCard`. */
  copy: Messages["molecules"]["addressCard"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** Where the address is edited. Without it, no edit link. */
  editHref?: string;
  /**
   * What `<form action>` takes to remove the address: M3's server action, or a URL (the form is
   * then posted with the address's id as `addressId`). Without it, no remove button.
   */
  removeAction?: React.ComponentProps<"form">["action"];
  /** A remove is on its way: the button says so and cannot submit again. */
  removing?: boolean;
  /**
   * The edit link's `prefetch` (next/link). Unset, Next prefetches the page when it comes into
   * view; the design system passes `false` because its pages do not exist before M3.
   */
  prefetch?: boolean | null;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the edit link's is a
// string the app built (the same cast as EmptyState's action).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function AddressCard({
  address,
  copy,
  locale,
  editHref,
  removeAction,
  removing = false,
  prefetch,
  className,
  ...props
}: AddressCardProps) {
  const nameId = useId();
  const lines = addressLines(address, locale);
  const who = {
    name: `${address.firstName} ${address.lastName}`.trim(),
    // Seven countries have no city (D65); the street then tells two addresses apart.
    city: address.city ?? address.address1,
  };
  const marks = [
    address.isDefaultShipping === true ? copy.defaultShipping : null,
    address.isDefaultBilling === true ? copy.defaultBilling : null,
  ].filter((mark): mark is string => mark !== null);
  const hasActions = editHref !== undefined || removeAction !== undefined;
  return (
    <article
      data-slot="address-card"
      aria-labelledby={nameId}
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground",
        className,
      )}
      {...props}
    >
      {marks.length === 0 ? null : (
        <ul data-slot="address-card-marks" className="flex flex-wrap gap-2">
          {marks.map((mark) => (
            <li key={mark} className="flex max-w-full">
              <Badge variant="secondary">{mark}</Badge>
            </li>
          ))}
        </ul>
      )}
      <address className="flex min-w-0 flex-col gap-0.5 text-sm leading-snug wrap-anywhere not-italic">
        {lines.map((line, index) => (
          <span
            key={index}
            id={line.kind === "name" ? nameId : undefined}
            data-kind={line.kind}
            className={cn("block", line.kind === "name" && "text-base font-semibold")}
          >
            {line.text}
          </span>
        ))}
        <span data-kind="country" className="block">
          {countryName(address.countryCode, locale)}
        </span>
        {address.phone === undefined ? null : (
          <span data-kind="phone" className="mt-1 block text-muted-foreground">
            {formatMessage(copy.phone, { phone: address.phone }, locale)}
          </span>
        )}
      </address>
      {hasActions ? (
        <div data-slot="address-card-actions" className="flex flex-wrap items-center gap-2">
          {editHref === undefined ? null : (
            <NextLink
              href={editHref as LinkHref}
              prefetch={prefetch}
              data-slot="address-card-edit"
              aria-label={formatMessage(copy.editLabel, who, locale)}
              className={cn(buttonVariants({ variant: "outline" }), "max-w-full")}
            >
              {copy.edit}
            </NextLink>
          )}
          {removeAction === undefined ? null : (
            <form
              action={removeAction}
              method={typeof removeAction === "function" ? undefined : "post"}
              data-slot="address-card-remove"
              className="flex max-w-full"
            >
              {removing ? (
                <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" />
              ) : null}
              {address.id === undefined ? null : (
                <input type="hidden" name="addressId" value={address.id} />
              )}
              <Button
                type={removing ? "button" : "submit"}
                variant="outline"
                disabled={removing}
                focusableWhenDisabled={removing}
                aria-busy={removing ? true : undefined}
                aria-label={formatMessage(
                  removing ? copy.removingLabel : copy.removeLabel,
                  who,
                  locale,
                )}
                className="max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                {removing ? <Spinner aria-hidden="true" label={copy.removing} /> : null}
                <span>{removing ? copy.removing : copy.remove}</span>
              </Button>
            </form>
          )}
        </div>
      ) : null}
      {removeAction === undefined ? null : (
        <div role="status" aria-live="polite" data-slot="address-card-status">
          {removing ? (
            <VisuallyHidden>{formatMessage(copy.removingLabel, who, locale)}</VisuallyHidden>
          ) : null}
        </div>
      )}
    </article>
  );
}

export { AddressCard };
export type { AddressCardProps };
