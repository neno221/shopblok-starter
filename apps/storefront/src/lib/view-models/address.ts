import type { Address } from "@shopblok/registry/contracts";
import type { AddressInput } from "../medusa/cart";
import type { CustomerAddressDto } from "../medusa/customer";

/** A saved address as AddressCard and AddressBook take it. Empty optional fields are left out. */
export function toAddress(address: CustomerAddressDto): Address {
  const optional = <K extends string>(key: K, value: string | null) =>
    value === null ? {} : ({ [key]: value } as Record<K, string>);
  return {
    id: address.id,
    firstName: address.firstName,
    lastName: address.lastName,
    ...optional("company", address.company),
    address1: address.address1,
    ...optional("address2", address.address2),
    // Required in the contract until T45 makes it optional (D65); "" never reaches a component.
    city: address.city ?? "",
    ...optional("province", address.province),
    ...optional("postalCode", address.postalCode),
    countryCode: address.countryCode,
    ...optional("phone", address.phone),
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  };
}

/** A checked form's address as the Store API takes it (the cart's and the customer's). */
export function toAddressInput(address: Omit<Address, "id">): AddressInput {
  return {
    first_name: address.firstName,
    last_name: address.lastName,
    ...(address.company ? { company: address.company } : {}),
    address_1: address.address1,
    ...(address.address2 ? { address_2: address.address2 } : {}),
    ...(address.city ? { city: address.city } : {}),
    ...(address.province ? { province: address.province } : {}),
    ...(address.postalCode ? { postal_code: address.postalCode } : {}),
    country_code: address.countryCode,
    ...(address.phone ? { phone: address.phone } : {}),
  };
}
