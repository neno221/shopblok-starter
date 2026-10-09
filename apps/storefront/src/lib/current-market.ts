import "server-only";
import { notFound } from "next/navigation";
import { market } from "next/root-params";
import { findShellMarket, type ShellMarket } from "./shell-markets";

/**
 * The market of the current request, from the `[market]` root param. An unknown key is a 404:
 * the root layout calls this first, so nothing else renders. Next's built-in 404 page answers, not
 * `global-not-found`, because the URL matches `/[market]`; T11's proxy removes the case (SETUP.md,
 * T08 item 2).
 */
export async function getCurrentMarket(): Promise<ShellMarket> {
  const current = findShellMarket(await market());
  if (current === undefined) notFound();
  return current;
}
