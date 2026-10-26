import "server-only";
import { AccountTemplate } from "@shopblok/ui/templates/account";
import {
  accountErrorsOf,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { saveAddress } from "../../../../../lib/actions/account";
import { readFlash } from "../../../../../lib/flash";
import { formCountries } from "../../../../../lib/view-models/checkout";
import { toAccountAddressForm } from "../../../../../lib/view-models/account";
import { notFound } from "next/navigation";

// The address pages' one body (T53): a new address (`addressId` undefined) or a change to one of
// the customer's; another's id is the 404. The countries are the market's region's (the checkout
// takes no other). A failed save comes back with what was typed (`?f=`).

export async function AddressScreen({
  addressId,
  flashKey,
}: {
  addressId?: string;
  flashKey?: string;
}) {
  const page = await accountPageContext();
  const { customer, context, market } = page;
  const path =
    addressId === undefined
      ? "/account/addresses/new"
      : `/account/addresses/${encodeURIComponent(addressId)}`;
  if (customer === null) return <SignInFirst page={page} path={path} />;
  const saved =
    addressId === undefined
      ? null
      : (customer.addresses.find((address) => address.id === addressId) ?? null);
  if (addressId !== undefined && saved === null) notFound();
  const [{ signOut, ...common }, flash] = await Promise.all([
    accountProps(page, "addresses"),
    readFlash(context.url(path), flashKey),
  ]);
  const typed = flash?.values;
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "address",
        ...(addressId === undefined ? {} : { addressId }),
        address: toAccountAddressForm(
          formCountries(market.country, context.region.countries),
          saved,
          typed,
        ),
        isDefaultShipping:
          typed !== undefined && Object.keys(typed).length > 0
            ? typed.isDefaultShipping === "true"
            : (saved?.isDefaultShipping ?? customer.addresses.length === 0),
        backHref: context.url("/account/addresses"),
      }}
      actions={{ signOut, saveAddress: saveAddress.bind(null, market.key) }}
      errors={accountErrorsOf(flash, "address")}
    />
  );
}
