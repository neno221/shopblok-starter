"use server";

import { rememberMarketAction } from "./market-handlers";

/** The explicit market choice (D66): `{ market }`, the key of an open market. */
export async function rememberMarket(...args: [unknown] | [unknown, unknown]) {
  return rememberMarketAction(...args);
}
