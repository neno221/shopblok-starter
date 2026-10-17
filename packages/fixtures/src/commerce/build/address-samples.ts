import type { AddressFormState } from "@shopblok/registry/contracts";
import { frAddress, genericAddress, gbAddress, jpAddress, mistakenValues } from "../data/addresses";
import type { CommerceFixture } from "../types";

/** AddressForm's and AddressCard's extra samples (T34); the same addresses in every locale. */
export function buildAddressSamples(): CommerceFixture["addressSamples"] {
  const values: AddressFormState["values"] = { ...mistakenValues };
  return {
    gb: { ...gbAddress },
    fr: { ...frAddress },
    jp: { ...jpAddress },
    generic: { ...genericAddress },
    mistaken: values,
  };
}
