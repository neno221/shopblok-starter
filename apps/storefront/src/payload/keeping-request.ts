import type { PayloadRequest } from "payload";

/**
 * Runs Local API calls that pass `req` and puts back what they change on it: Payload sets
 * `req.locale`, `req.fallbackLocale` and `req.context` to the call's, so without this the hooks of
 * the save in progress would run in another language after the first call (T65's page hooks; a
 * post's slug check, PR 100 review item 2, whose `locale: "all"` read emptied the save's texts).
 */
export async function keepingRequest<T>(req: PayloadRequest, run: () => Promise<T>): Promise<T> {
  const { locale, fallbackLocale, context } = req;
  try {
    return await run();
  } finally {
    req.locale = locale;
    req.fallbackLocale = fallbackLocale;
    req.context = context;
  }
}
