import type { AddressFormState } from "@shopblok/registry/contracts";
import {
  frAddress,
  genericAddress,
  gbAddress,
  jpAddress,
  mistakenValues,
  sgAddress,
} from "../data/addresses";
import type { CommerceFixture } from "../types";

/** AddressForm's and AddressCard's extra samples (T34); the same addresses in every locale. */
export function buildAddressSamples(): CommerceFixture["addressSamples"] {
  const values: AddressFormState["values"] = { ...mistakenValues };
  return {
    gb: { ...gbAddress },
    fr: { ...frAddress },
    jp: { ...jpAddress },
    sg: { ...sgAddress },
    generic: { ...genericAddress },
    mistaken: values,
  };
}
