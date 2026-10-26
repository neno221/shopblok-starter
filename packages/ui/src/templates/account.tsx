// Ours (T53, SETUP.md "Auth and account (T53)"; D64, SPEC §8.4, SBP layouts/account.md). The
// account's `<main>`: AccountNav beside the screen the customer is on (above it below `md`), the
// screen's `<h1>` first in its column.
// - **Overview:** the greeting with the customer's first name, the address they sign in with, the
//   latest orders (OrderTable) with the way to all of them, and the ways to the addresses, the
//   profile and the claim of a guest order.
// - **Orders:** OrderTable, a page at a time (Pagination's links, `?page=n`), and the claim.
// - **Order:** its number and date in the market's time zone, where it went, how it was delivered
//   and paid, its history (OrderTimeline), its summary (OrderSummary, open) and the return.
// - **Addresses / address:** AddressBook with its remove and default forms; AddressForm with the
//   "default shipping address" checkbox inside its form.
// - **Payment methods:** PaymentMethodsManager (its empty state until M6's Stripe).
// - **Returns / return:** the orders with something to send back; ReturnRequestForm.
// - **Profile:** the name and the phone; the e-mail is shown, not changed (it is the sign-in).
// Every form is plain and posts without scripts; an action's failure comes back as `errors`. A
// server component.
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type { AccountPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Button } from "@shopblok/ui/atoms/button";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import { AddressForm, type AddressFormErrors } from "@shopblok/ui/molecules/address-form";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import { AccountNav } from "@shopblok/ui/organisms/account-nav";
import { AddressBook } from "@shopblok/ui/organisms/address-book";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTable } from "@shopblok/ui/organisms/order-table";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import { PaymentMethodsManager } from "@shopblok/ui/organisms/payment-methods-manager";
import {
  ReturnRequestForm,
  type ReturnRequestErrors,
} from "@shopblok/ui/organisms/return-request-form";
import { ChevronRightIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";
import { FormAlert, FormStatus, TextField } from "./form-parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FormAction = React.ComponentProps<"form">["action"];

type AccountCopy = {
  page: Messages["templates"]["account"];
  nav: Messages["organisms"]["accountNav"];
  table: Messages["organisms"]["orderTable"];
  pagination: Messages["molecules"]["pagination"];
  timeline: Messages["organisms"]["orderTimeline"];
  summary: Messages["organisms"]["orderSummary"];
  rows: Messages["molecules"]["orderSummaryRow"];
  addressCard: Messages["molecules"]["addressCard"];
  addressBook: Messages["organisms"]["addressBook"];
  addressForm: Messages["molecules"]["addressForm"];
  wallet: React.ComponentProps<typeof PaymentMethodsManager>["copy"];
  returnForm: Messages["organisms"]["returnRequestForm"];
  fields: Messages["templates"]["auth"]["fields"];
  fieldErrors: Messages["templates"]["auth"]["errors"];
};

/** The account's words from a whole catalog: its own and its organisms' and molecules'. */
function accountCopy(messages: Messages): AccountCopy {
  const { atoms, molecules, organisms, templates } = messages;
  return {
    page: templates.account,
    nav: organisms.accountNav,
    table: organisms.orderTable,
    pagination: molecules.pagination,
    timeline: organisms.orderTimeline,
    summary: organisms.orderSummary,
    rows: molecules.orderSummaryRow,
    addressCard: molecules.addressCard,
    addressBook: organisms.addressBook,
    addressForm: molecules.addressForm,
    wallet: {
      manager: organisms.paymentMethodsManager,
      card: molecules.savedPaymentMethodCard,
      brands: atoms.payment,
    },
    returnForm: organisms.returnRequestForm,
    fields: templates.auth.fields,
    fieldErrors: templates.auth.errors,
  };
}

/** What an account form's action answered: the form's error, and each field's. */
type AccountErrors = {
  form?: keyof Messages["templates"]["account"]["formErrors"];
  address?: AddressFormErrors;
  profile?: Partial<Record<"firstName" | "lastName" | "phone", "required" | "invalid">>;
  return?: ReturnRequestErrors;
};

/** The forms' actions, each the screen's that has the form. */
type AccountActions = {
  signOut?: FormAction;
  removeAddress?: FormAction;
  defaultAddress?: FormAction;
  saveAddress?: FormAction;
  saveProfile?: FormAction;
  requestReturn?: FormAction;
};

type AccountTemplateProps = AccountPage & {
  copy: AccountCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65) the dates are in; UTC unless given. */
  timeZone?: string;
  /** The time a saved card's expiry is judged by (PaymentMethodsManager's), an ISO timestamp. */
  now: string;
  actions?: AccountActions;
  errors?: AccountErrors;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const linkClass =
  "font-medium text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring";
// A link on a line of its own is a control, so its row is 44 px high (D32); a link inside a
// sentence keeps the sentence's line.
const ownLineLinkClass = cn(linkClass, "inline-flex min-h-11 max-w-full items-center");
const titleClass = "text-2xl leading-tight font-semibold wrap-break-word md:text-3xl";
const sectionHeading = "text-lg leading-snug font-semibold wrap-break-word";
const partHeading = "text-base leading-snug font-semibold wrap-anywhere";

function AccountTemplate({
  nav,
  screen,
  copy,
  locale,
  timeZone = "UTC",
  now,
  actions = {},
  errors = {},
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: AccountTemplateProps) {
  const words = copy.page;
  const link = (href: string, label: string, slot: string, extra?: string) => (
    <NextLink
      href={href as LinkHref}
      prefetch={prefetch}
      data-slot={slot}
      className={cn(ownLineLinkClass, extra)}
    >
      {label}
    </NextLink>
  );
  const alert =
    errors.form === undefined ? null : (
      <FormAlert slot="account-error">{words.formErrors[errors.form]}</FormAlert>
    );
  return (
    <Root
      id={mainId}
      data-slot="account-template"
      data-variant="default"
      data-screen={screen.kind}
      className={cn(
        "mx-auto grid w-full max-w-7xl min-w-0 grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10 md:px-6 md:py-12 lg:px-8",
        className,
      )}
    >
      <AccountNav
        {...nav}
        copy={copy.nav}
        signOutAction={actions.signOut}
        prefetch={prefetch}
        className="md:sticky md:top-4 md:self-start"
      />
      <div data-slot="account-screen" className="flex min-w-0 flex-col gap-6">
        {screen.kind === "overview" ? (
          <>
            <header className="flex min-w-0 flex-col gap-1">
              <h1 className={titleClass}>
                {screen.firstName === undefined
                  ? words.overview.title
                  : formatMessage(words.overview.greeting, { name: screen.firstName }, locale)}
              </h1>
              <p className="text-muted-foreground wrap-anywhere">
                {formatMessage(words.overview.signedInAs, { email: screen.email }, locale)}
              </p>
            </header>
            <section
              data-slot="account-recent"
              aria-labelledby={`${mainId}-recent`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h2 id={`${mainId}-recent`} className={sectionHeading}>
                {words.overview.recent}
              </h2>
              <OrderTable
                {...screen.recent}
                copy={copy.table}
                locale={locale}
                timeZone={timeZone}
                label={words.overview.recent}
                headingLevel={3}
                prefetch={prefetch}
              />
              {screen.recent.orders.length === 0
                ? null
                : link(
                    screen.ordersHref,
                    words.overview.allOrders,
                    "account-all-orders",
                    "self-start text-sm",
                  )}
            </section>
            <section
              data-slot="account-manage"
              aria-labelledby={`${mainId}-manage`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h2 id={`${mainId}-manage`} className={sectionHeading}>
                {words.overview.manage}
              </h2>
              <ul role="list" className="grid min-w-0 gap-3 sm:grid-cols-3">
                {(
                  [
                    [screen.addressesHref, words.overview.addresses, words.overview.addressesText],
                    [screen.profileHref, words.overview.profile, words.overview.profileText],
                    [screen.lookupHref, words.overview.lookup, words.overview.lookupText],
                  ] as const
                ).map(([href, label, text]) => (
                  <li key={href} className="flex min-w-0">
                    <NextLink
                      href={href as LinkHref}
                      prefetch={prefetch}
                      data-slot="account-shortcut"
                      className="flex min-h-11 w-full min-w-0 items-start justify-between gap-3 rounded-xl border p-4 text-foreground no-underline outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium wrap-break-word">{label}</span>
                        <span className="text-sm leading-snug wrap-break-word text-muted-foreground">
                          {text}
                        </span>
                      </span>
                      <ChevronRightIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    </NextLink>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : screen.kind === "orders" ? (
          <>
            <h1 className={titleClass}>{words.orders.title}</h1>
            <OrderTable
              {...screen.table}
              copy={copy.table}
              locale={locale}
              timeZone={timeZone}
              headingLevel={2}
              prefetch={prefetch}
            />
            {screen.page.pageCount > 1 ? (
              <Pagination
                {...screen.page}
                hrefFor={(page) =>
                  page === 1 ? screen.pageHref : `${screen.pageHref}?page=${page}`
                }
                copy={copy.pagination}
                locale={locale}
              />
            ) : null}
            {link(screen.lookupHref, words.orders.lookup, "account-lookup", "self-start text-sm")}
          </>
        ) : screen.kind === "order" ? (
          <OrderScreen
            screen={screen}
            copy={copy}
            locale={locale}
            timeZone={timeZone}
            link={link}
            prefetch={prefetch}
          />
        ) : screen.kind === "addresses" ? (
          <>
            <h1 className={titleClass}>{words.addresses.title}</h1>
            {alert}
            <AddressBook
              {...screen.book}
              copy={{ book: copy.addressBook, card: copy.addressCard }}
              locale={locale}
              removeAction={actions.removeAddress}
              defaultAction={actions.defaultAddress}
              headingLevel={2}
              prefetch={prefetch}
            />
          </>
        ) : screen.kind === "address" ? (
          <>
            <h1 className={titleClass}>
              {screen.addressId === undefined ? words.address.titleNew : words.address.titleEdit}
            </h1>
            {alert}
            <AddressForm
              {...screen.address}
              values={
                screen.addressId === undefined
                  ? screen.address.values
                  : { ...screen.address.values, id: screen.addressId }
              }
              copy={copy.addressForm}
              locale={locale}
              action={actions.saveAddress}
              errors={errors.address}
            >
              <label className="flex min-h-11 min-w-0 items-center gap-3 text-sm leading-snug">
                <input
                  type="checkbox"
                  name="isDefaultShipping"
                  value="true"
                  defaultChecked={screen.isDefaultShipping}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 wrap-break-word">{words.address.defaultShipping}</span>
              </label>
            </AddressForm>
            {link(screen.backHref, words.address.back, "account-back", "self-start text-sm")}
          </>
        ) : screen.kind === "payment-methods" ? (
          <>
            <h1 className={titleClass}>{words.paymentMethods.title}</h1>
            <PaymentMethodsManager
              {...screen.wallet}
              copy={copy.wallet}
              locale={locale}
              now={now}
              headingLevel={2}
              prefetch={prefetch}
            />
            {screen.wallet.addHref === undefined ? (
              <p className="text-sm text-muted-foreground wrap-break-word">
                {words.paymentMethods.note}
              </p>
            ) : null}
          </>
        ) : screen.kind === "returns" ? (
          <>
            <header className="flex min-w-0 flex-col gap-1">
              <h1 className={titleClass}>{words.returns.title}</h1>
              {screen.table.orders.length === 0 ? null : (
                <p className="text-muted-foreground wrap-break-word">{words.returns.lead}</p>
              )}
            </header>
            <OrderTable
              {...screen.table}
              copy={{
                ...copy.table,
                emptyTitle: words.returns.emptyTitle,
                emptyText: words.returns.emptyText,
                emptyAction: words.returns.emptyAction,
              }}
              locale={locale}
              timeZone={timeZone}
              headingLevel={2}
              prefetch={prefetch}
            />
          </>
        ) : screen.kind === "return" ? (
          <>
            <h1 className={titleClass}>{words.return.title}</h1>
            {screen.sent ? (
              <FormStatus slot="account-return-sent">{words.return.sent}</FormStatus>
            ) : (
              <>
                {alert}
                <ReturnRequestForm
                  {...screen.request}
                  copy={copy.returnForm}
                  locale={locale}
                  action={actions.requestReturn}
                  errors={errors.return}
                />
              </>
            )}
            {link(screen.backHref, words.return.back, "account-back", "self-start text-sm")}
          </>
        ) : (
          <>
            <h1 className={titleClass}>{words.profile.title}</h1>
            {screen.saved ? (
              <FormStatus slot="account-profile-saved">{words.profile.saved}</FormStatus>
            ) : null}
            {alert}
            <ProfileForm
              screen={screen}
              copy={copy}
              locale={locale}
              action={actions.saveProfile}
              errors={errors.profile}
              mainId={mainId}
            />
          </>
        )}
      </div>
    </Root>
  );
}

type Screen<Kind> = Extract<AccountPage["screen"], { kind: Kind }>;

function OrderScreen({
  screen,
  copy,
  locale,
  timeZone,
  link,
  prefetch,
}: {
  screen: Screen<"order">;
  copy: AccountCopy;
  locale: string;
  timeZone: string;
  link: (href: string, label: string, slot: string, extra?: string) => React.ReactNode;
  prefetch?: boolean | null;
}) {
  const words = copy.page.order;
  const { order } = screen;
  const part = "flex min-w-0 flex-col gap-2 text-sm leading-snug";
  return (
    <>
      <header className="flex min-w-0 flex-col gap-1">
        <h1 className={titleClass}>
          {formatMessage(words.title, { number: String(order.displayId) }, locale)}
        </h1>
        <p data-slot="account-order-placed" className="text-muted-foreground">
          {formatMessage(
            words.placed,
            {
              date: formatDate(order.placedAt, locale, {
                dateStyle: "long",
                timeStyle: "short",
                timeZone,
              }),
            },
            locale,
          )}
        </p>
      </header>
      <div className="grid min-w-0 gap-6 sm:grid-cols-3">
        <section data-slot="account-order-shipping" className={part}>
          <h2 className={partHeading}>{words.shipping}</h2>
          <AddressCard
            address={order.shippingAddress}
            copy={copy.addressCard}
            locale={locale}
            className="border-0 p-0"
          />
        </section>
        <section data-slot="account-order-delivery" className={part}>
          <h2 className={partHeading}>{words.delivery}</h2>
          <p className="flex flex-wrap justify-between gap-x-3">
            <span className="wrap-anywhere">{order.shippingMethod.name}</span>
            {order.shippingMethod.price.amount === 0 ? (
              <span className="text-success">{copy.rows.free}</span>
            ) : (
              <Price
                amount={order.shippingMethod.price.amount}
                currency={order.shippingMethod.price.currencyCode}
                locale={locale}
              />
            )}
          </p>
        </section>
        <section data-slot="account-order-payment" className={part}>
          <h2 className={partHeading}>{words.payment}</h2>
          <p className="wrap-anywhere">
            {order.payment.name ?? order.payment.brand ?? ""}
            {order.payment.last4 === undefined ? null : ` •••• ${order.payment.last4}`}
          </p>
        </section>
      </div>
      <OrderTimeline
        events={order.events}
        copy={copy.timeline}
        locale={locale}
        timeZone={timeZone}
      />
      <OrderSummary
        {...screen.summary}
        copy={copy.summary}
        rowCopy={copy.rows}
        locale={locale}
        defaultOpen
      />
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
        {screen.returnHref === undefined ? null : (
          <NextLink
            href={screen.returnHref as LinkHref}
            prefetch={prefetch}
            data-slot="account-order-return"
            className={cn(buttonVariants({ variant: "outline" }), "max-w-full")}
          >
            {words.return}
          </NextLink>
        )}
        {link(screen.backHref, words.back, "account-back", "text-sm")}
      </div>
    </>
  );
}

function ProfileForm({
  screen,
  copy,
  locale,
  action,
  errors = {},
  mainId,
}: {
  screen: Screen<"profile">;
  copy: AccountCopy;
  locale: string;
  action?: FormAction;
  errors?: AccountErrors["profile"];
  mainId: string;
}) {
  const words = copy.page.profile;
  const fields = copy.fields;
  const labels = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    phone: fields.phone,
  };
  const errorOf = (field: keyof typeof labels) => {
    const kind = errors[field];
    return kind === undefined
      ? undefined
      : formatMessage(copy.fieldErrors[kind], { field: labels[field] }, locale);
  };
  return (
    <form
      action={action}
      method={typeof action === "function" ? undefined : "post"}
      data-slot="account-profile-form"
      aria-label={words.title}
      className="flex w-full max-w-xl min-w-0 flex-col gap-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm leading-snug font-medium">{words.email}</p>
        <p data-slot="account-profile-email" className="wrap-anywhere">
          {screen.email}
        </p>
        <p className="text-sm leading-snug text-muted-foreground">{words.emailNote}</p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextField
          id={`${mainId}-first-name`}
          name="firstName"
          label={labels.firstName}
          autoComplete="given-name"
          required
          defaultValue={screen.values.firstName}
          error={errorOf("firstName")}
        />
        <TextField
          id={`${mainId}-last-name`}
          name="lastName"
          label={labels.lastName}
          autoComplete="family-name"
          required
          defaultValue={screen.values.lastName}
          error={errorOf("lastName")}
        />
      </div>
      <TextField
        id={`${mainId}-phone`}
        name="phone"
        label={labels.phone}
        optionalLabel={fields.optional}
        type="tel"
        autoComplete="tel"
        defaultValue={screen.values.phone}
        error={errorOf("phone")}
      />
      <Button type="submit" size="lg" className="max-w-full self-start">
        {words.submit}
      </Button>
    </form>
  );
}

export { AccountTemplate, accountCopy };
export type { AccountActions, AccountCopy, AccountErrors, AccountTemplateProps };
