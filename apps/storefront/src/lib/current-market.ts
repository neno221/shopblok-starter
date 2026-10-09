import "server-only";
import { notFound } from "next/navigation";
import { market } from "next/root-params";
import { findShellMarket, type ShellMarket } from "./shell-markets";

/**
 * The market of the current request, from the `[market]` root param. An unknown key is a 404:
 * the root layout calls this first, so the 404 comes from `global-not-found` before anything renders.
 */
export async function getCurrentMarket(): Promise<ShellMarket> {
  const current = findShellMarket(await market());
  if (current === undefined) notFound();
  return current;
}
