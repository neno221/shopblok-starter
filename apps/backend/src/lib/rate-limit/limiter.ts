import { createHash } from "node:crypto";

import { addressKey } from "./address";
import { RULES, type RuleName } from "./rules";
import { SERVER_ADDRESS } from "./signature";
import { storeFor, type CounterStore, type Warn } from "./store";

/**
 * M7 D142 (T108): consumes a rule for one caller. Every counter of the rule is hit (a fixed window
 * each, `rl:<counter>:<sha256(…)>` in the store); the call is refused when any of them is over its
 * limit, and asked to wait until the latest of those windows ends. An e-mail is hashed before it
 * becomes a key, so the store never holds one.
 */

export type Verdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type Caller = {
  /** The signed address, `server`, or the request's own address. */
  address: string;
  /** The rule's key, when it has one: an e-mail (hashed here), a form's id, a cart's id, a user. */
  key?: string | undefined;
};

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/** An e-mail as a key: trimmed, lower case, then its SHA-256 (the storefront sends it hashed). */
export const emailKey = (email: string): string => sha256(email.trim().toLowerCase());

export class Limiter {
  constructor(private readonly store: CounterStore) {}

  async consume(name: RuleName, caller: Caller): Promise<Verdict> {
    const server = caller.address === SERVER_ADDRESS;
    const address = addressKey(caller.address);
    let wait = 0;
    for (const counter of RULES[name].counters) {
      if (server && counter.scope !== "key") continue;
      // A rule with a key always gets one; a call that has none shares the empty key's counter.
      const key = caller.key ?? "";
      const subject =
        counter.scope === "address" ? address : counter.scope === "key" ? key : `${address}\n${key}`;
      const hit = await this.store.hit(`rl:${counter.id}:${sha256(subject)}`, counter.windowMs);
      if (hit !== undefined && hit.count > counter.limit) {
        wait = Math.max(wait, Math.ceil(Math.max(hit.ttlMs, 1) / 1000));
      }
    }
    return wait > 0 ? { allowed: false, retryAfterSeconds: wait } : { allowed: true };
  }
}

const KEY = Symbol.for("shopblok.rate-limit.limiter");
type Holder = typeof globalThis & { [KEY]?: Limiter };

/**
 * The process's limiter, made on first use from `REDIS_URL`: one Redis connection per process. On
 * `globalThis`, as `lib/sentry.ts` keeps its SDK, so a second copy of this module (Medusa's loader,
 * a test's) shares it.
 */
export function processLimiter(warn: Warn = (message) => console.warn(message)): Limiter {
  const holder = globalThis as Holder;
  holder[KEY] ??= new Limiter(storeFor(process.env.REDIS_URL, warn));
  return holder[KEY];
}

/** For the tests: replaces the process's limiter (or drops it, to make it again from the env). */
export function setProcessLimiter(limiter: Limiter | undefined): void {
  const holder = globalThis as Holder;
  if (limiter === undefined) delete holder[KEY];
  else holder[KEY] = limiter;
}
