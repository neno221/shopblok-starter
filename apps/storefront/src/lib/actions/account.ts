"use server";

import {
  claimOrderForm,
  defaultAddressForm,
  removeAddressForm,
  requestReturnForm,
  saveAddressForm,
  saveProfileForm,
  transferForm,
} from "./account-forms";

// The account's and the order claim's form actions (T53). The bodies are in `account-forms.ts`; a
// `"use server"` file exports async functions only. Each takes the market's key (bound by the
// page) and the form's data, and redirects.

export async function saveProfile(market: string, data: FormData) {
  return saveProfileForm(market, data);
}

export async function saveAddress(market: string, data: FormData) {
  return saveAddressForm(market, data);
}

export async function removeAddress(market: string, data: FormData) {
  return removeAddressForm(market, data);
}

export async function makeDefaultAddress(market: string, data: FormData) {
  return defaultAddressForm(market, data);
}

export async function requestReturn(market: string, data: FormData) {
  return requestReturnForm(market, data);
}

export async function claimGuestOrder(market: string, data: FormData) {
  return claimOrderForm(market, data);
}

export async function answerTransfer(
  market: string,
  orderId: string,
  token: string,
  data: FormData,
) {
  return transferForm(market, orderId, token, data);
}
