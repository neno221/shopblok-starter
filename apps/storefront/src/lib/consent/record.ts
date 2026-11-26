import "server-only";
import { randomUUID } from "node:crypto";
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { cookies } from "next/headers";
import { getPayloadClient } from "../cms/payload";
import { CONSENT_COOKIE } from "../cookie-names";
import { isProduction } from "../env";
import type { Market } from "../markets/types";
import { consumeLimit } from "../security/rate-limit";
import {
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  formatConsent,
  parseConsent,
  type ConsentRecord,
} from "../visitor/consent-cookie";
import type { ConsentRecordKind } from "../../payload/collections/consent-records";

// M7 D145 (T109): the server's record of a cookie choice (GDPR Art. 7(1)). Each save, change and
// withdrawal, with scripts (the consent island's action, after it wrote the cookie) and without
// (the "Cookie settings" form on the policy page, whose action writes the cookie), keeps one
// `consent-records` document: the consent id, the two answers, the policy's version, the market
// and the language, never an address, a user agent or a customer. The id is random, made here on
// the first record and kept at the end of the cookie (`consent-cookie.ts`), so one visitor's
// records share it. Under T108's `consent` limit (30 an hour per address): over it, the choice
// still holds in the cookie and no record is written (the visitor is told nothing; one log line).

/** A record's kind: the id's first, a change, or a withdrawal (a category that was on is off). */
export function kindOf(
  previous: ConsentChoice | undefined,
  next: ConsentChoice,
): ConsentRecordKind {
  if (previous === undefined) return "given";
  return (previous.analytics && !next.analytics) || (previous.marketing && !next.marketing)
    ? "withdrawn"
    : "changed";
}

/** The consent cookie's attributes when the server writes it: the browser's own line's. */
const cookieOptions = () => ({
  path: "/",
  maxAge: CONSENT_MAX_AGE,
  sameSite: "lax" as const,
  secure: isProduction(),
  httpOnly: false,
});

export type KeptConsent =
  | { kept: true; id: string; kind: ConsentRecordKind }
  | { kept: false; reason: "no-choice" | "too-many" | "unavailable" };

/**
 * Records `choice` (or, without one, what the request's consent cookie says) for `market`, and
 * writes the cookie with the record's id. Only a server action may call it (it sets the cookie).
 */
export async function keepConsent(market: Market, choice?: ConsentChoice): Promise<KeptConsent> {
  const jar = await cookies();
  const current: ConsentRecord | null = parseConsent(jar.get(CONSENT_COOKIE)?.value);
  const chosen = choice ?? current?.choice;
  if (chosen === undefined) return { kept: false, reason: "no-choice" };
  const id = current?.id ?? randomUUID();
  jar.set(CONSENT_COOKIE, formatConsent(chosen, new Date(), id), cookieOptions());

  const limit = await consumeLimit("consent");
  if (!limit.allowed) return { kept: false, reason: "too-many" };
  try {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "consent-records",
      where: { consentId: { equals: id } },
      sort: "-createdAt",
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const last = docs[0];
    const kind = kindOf(
      last === undefined ? undefined : { analytics: last.analytics, marketing: last.marketing },
      chosen,
    );
    await payload.create({
      collection: "consent-records",
      data: {
        consentId: id,
        kind,
        analytics: chosen.analytics,
        marketing: chosen.marketing,
        policyVersion: CONSENT_VERSION,
        market: market.key,
        language: market.language,
      },
      overrideAccess: true,
      depth: 0,
    });
    return { kept: true, id, kind };
  } catch (error) {
    console.error(
      `consent: the record could not be kept (${error instanceof Error ? error.message : "error"})`,
    );
    return { kept: false, reason: "unavailable" };
  }
}
