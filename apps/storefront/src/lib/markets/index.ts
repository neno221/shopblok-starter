// The pure part of the markets library: safe to import anywhere, client code included.
// `getMarketMap` lives in `get-market-map.ts` (it imports Payload) and is imported from there.
export { hreflangAlternates } from "./hreflang";
export { fallbackMarketOf, findMarket, listMarkets, primaryMarket, toInternalKey } from "./market";
export { resolve } from "./resolve";
export { buildPublicUrl, mailTarget, marketPrefix, type MailTarget } from "./url";
export type { Market, MarketMap, RequestUrl, Resolution } from "./types";
