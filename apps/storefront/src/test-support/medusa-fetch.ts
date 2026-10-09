import { vi } from "vitest";

export const PUBLISHABLE_KEY =
  "pk_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export type MedusaCall = { url: URL; headers: Headers };

type Answer = { status?: number; body: unknown } | Error;

/**
 * Replaces `fetch`, which the Medusa SDK calls, with a stub that records each request and answers
 * from `answer`. The SDK itself is the real one, so a test sees the headers and the URL it builds.
 */
export function stubMedusaFetch(answer: (call: MedusaCall) => Answer): MedusaCall[] {
  const calls: MedusaCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      const call = { url: new URL(String(input)), headers: new Headers(init?.headers) };
      calls.push(call);
      const result = answer(call);
      if (result instanceof Error) throw result;
      return new Response(JSON.stringify(result.body), {
        status: result.status ?? 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

/** What Node's `fetch` throws when nothing listens on the port. */
export function connectionRefused(): TypeError {
  return new TypeError("fetch failed", {
    cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
  });
}
