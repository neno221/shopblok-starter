import "server-only";
import { z } from "zod";
import { getMarketContext, type MarketContext } from "../market-context";
import { ActionError } from "./action";

// What the actions' schemas and handlers share (T52, T53): the market's key as a form sends it, a
// text field, and the market's context, or the refusal a key that names no open market gets.

export const marketKey = z.string().min(1).max(64);

/** A field as a form sends it: trimmed, empty is absent. */
export const formText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export async function contextFor(key: string): Promise<MarketContext> {
  const context = await getMarketContext(key);
  if (context === null) throw new ActionError("not-found", `no open market ${key}`);
  return context;
}
