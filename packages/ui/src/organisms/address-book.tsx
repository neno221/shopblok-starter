// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, SBP account.md). The
// account's addresses: a list named "Saved addresses" of AddressCards (each in its country's format,
// with its default marks, its edit link and its remove form), one or two columns by the space there is,
// and a last tile, "Add a new address", a 44 px link with a dashed border to the page that adds one. An
// address that is not the default for shipping has "Set as default" under its card: the submit of a
// small form of its own (`defaultAction`, posting `addressId`), named for its address ("Set as default:
// Lena Hartmann, Berlin", the visible words first). What is in flight (`pending`: the address, and
// whether it is being removed or made the default) holds that address's buttons (AddressCard's
// `removing`; the default button `aria-disabled`, "Saving…", and said in a polite region that is
// always there), so nothing is sent twice. With no address the book is EmptyState with the add link.
// Forms post unless the action is a function (M3's server actions). A server component: it holds no
// state.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { AddressBook as AddressBookContent } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { MapPinIcon, PlusIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type FormAction = React.ComponentProps<"form">["action"];

type AddressBookProps = Omit<React.ComponentProps<"div">, "children"> &
  AddressBookContent & {
    /** The wording: the book's own, and AddressCard's. */
    copy: {
      book: Messages["organisms"]["addressBook"];
      card: Messages["molecules"]["addressCard"];
    };
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The list's name when a page has two (the design system's states). */
    label?: string;
    /** What `<form action>` takes to remove an address (it receives `addressId`). None: no button. */
    removeAction?: FormAction;
    /** The same to make an address the default (it receives `addressId`). None: no button. */
    defaultAction?: FormAction;
    /** What is on its way: an address being removed or made the default. */
    pending?: { addressId: string; action: "remove" | "default" };
    /** The empty state's heading level. */
    headingLevel?: 2 | 3 | 4;
    /** next/link's `prefetch`; the design system passes `false`. */
    prefetch?: boolean | null;
  };

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function AddressBook({
  entries,
  addHref,
  copy,
  locale,
  label,
  removeAction,
  defaultAction,
  pending,
  headingLevel = 2,
  prefetch,
  className,
  ...props
}: AddressBookProps) {
  const words = copy.book;
  if (entries.length === 0)
    return (
      <div data-slot="address-book" data-empty="" className={cn("min-w-0", className)} {...props}>
        <EmptyState
          icon={MapPinIcon}
          title={words.emptyTitle}
          text={words.emptyText}
          action={{ label: words.add, href: addHref }}
          headingLevel={headingLevel}
          prefetch={prefetch}
        />
      </div>
    );
  const method = typeof defaultAction === "function" ? undefined : "post";
  return (
    <div data-slot="address-book" className={cn("@container min-w-0", className)} {...props}>
      <ul
        role="list"
        aria-label={label ?? words.list}
        className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2"
      >
        {entries.map(({ address, editHref }) => {
          const removing = pending?.addressId === address.id && pending.action === "remove";
          const saving = pending?.addressId === address.id && pending.action === "default";
          const who = {
            name: `${address.firstName} ${address.lastName}`.trim(),
            city: address.city,
          };
          return (
            <li
              key={address.id}
              data-slot="address-book-entry"
              className="flex min-w-0 flex-col gap-2"
            >
              <AddressCard
                address={address}
                copy={copy.card}
                locale={locale}
                editHref={editHref}
                removeAction={removeAction}
                removing={removing}
                prefetch={prefetch}
                className="flex-1"
              />
              {defaultAction === undefined || address.isDefaultShipping === true ? null : (
                <form
                  action={defaultAction}
                  method={method}
                  data-slot="address-book-default"
                  className="flex max-w-full"
                >
                  {saving ? (
                    <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" />
                  ) : null}
                  <input type="hidden" name="addressId" value={address.id} />
                  <Button
                    type={saving ? "button" : "submit"}
                    variant="ghost"
                    disabled={saving}
                    focusableWhenDisabled={saving}
                    aria-busy={saving ? true : undefined}
                    aria-label={
                      saving ? undefined : formatMessage(words.makeDefaultLabel, who, locale)
                    }
                    className="max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  >
                    {saving ? <Spinner aria-hidden="true" label={words.saving} /> : null}
                    <span className="min-w-0 wrap-anywhere">
                      {saving ? words.saving : words.makeDefault}
                    </span>
                  </Button>
                  <span role="status" aria-live="polite" className="sr-only">
                    {saving ? words.saving : null}
                  </span>
                </form>
              )}
            </li>
          );
        })}
        <li className="flex min-w-0">
          <NextLink
            href={addHref as LinkHref}
            prefetch={prefetch}
            data-slot="address-book-add"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "min-h-24 w-full flex-1 border-dashed",
            )}
          >
            <Icon icon={PlusIcon} />
            <span className="min-w-0 wrap-anywhere">{words.add}</span>
          </NextLink>
        </li>
      </ul>
    </div>
  );
}

export { AddressBook };
export type { AddressBookProps };
