"use server";

import {
  forgotForm,
  loginForm,
  logoutForm,
  registerForm,
  resendForm,
  resetForm,
} from "./auth-forms";

// The auth pages' form actions (T53). The bodies are in `auth-forms.ts`; a `"use server"` file
// exports async functions only. Each takes the market's key (bound by the page) and the form's
// data, and redirects.

export async function signIn(market: string, data: FormData) {
  return loginForm(market, data);
}

export async function signUp(market: string, data: FormData) {
  return registerForm(market, data);
}

export async function sendVerificationAgain(market: string, data: FormData) {
  return resendForm(market, data);
}

export async function askPasswordReset(market: string, data: FormData) {
  return forgotForm(market, data);
}

export async function saveNewPassword(market: string, data: FormData) {
  return resetForm(market, data);
}

export async function signOut(market: string) {
  return logoutForm(market);
}
