import { isIP } from "node:net";

/**
 * M7 D142 (T108): the address a counter is kept for, as Medusa's limiter keys it
 * (`apps/backend/src/lib/rate-limit/address.ts`; keep the two the same, `address-key.test.ts` holds
 * the same table). `/next/csp-report`'s in-memory limit uses it (the review of PR 153). IPv4 as it is; an IPv4 address mapped into
 * IPv6 (`::ffff:203.0.113.7`, how Node reports a v4 caller on a dual-stack socket) as the IPv4
 * address; IPv6 by its /64, the block one subscriber is usually given, so a visitor cannot get a
 * fresh counter by moving within it. Anything else (`undefined`, a malformed value) is `unknown`,
 * one shared counter, never a free pass.
 */
export function addressKey(address: string | undefined): string {
  if (address === undefined) return "unknown";
  const trimmed = address.trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (mapped?.[1] !== undefined && isIP(mapped[1]) === 4) return mapped[1];
  const kind = isIP(trimmed);
  if (kind === 4) return trimmed;
  if (kind === 6) return `${expandIpv6(trimmed).slice(0, 4).join(":")}::/64`;
  return "unknown";
}

/** An IPv6 address as its eight groups, each lower case without leading zeros (`2001:db8:0:0:…`). */
function expandIpv6(address: string): string[] {
  // A zone (`fe80::1%eth0`) names the interface, not the address.
  let rest = address.split("%")[0] ?? address;
  // A trailing IPv4 part (`::ffff:1.2.3.4` is handled above; `64:ff9b::1.2.3.4` here) is two groups.
  const v4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(rest);
  if (v4 !== null) {
    const [a, b, c, d] = v4.slice(1).map(Number) as [number, number, number, number];
    rest = `${rest.slice(0, v4.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = "", tail] = rest.split("::");
  const left = head === "" ? [] : head.split(":");
  const right = tail === undefined || tail === "" ? [] : tail.split(":");
  const fill = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill("0");
  return [...left, ...fill, ...right].map((group) => parseInt(group, 16).toString(16));
}
