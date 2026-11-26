import { describe, expect, it } from "vitest";
import { addressKey } from "./address-key";

// The same table as Medusa's (`apps/backend/src/lib/rate-limit/__tests__/limiter.unit.spec.ts`).
describe("addressKey", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    [" 203.0.113.7 ", "203.0.113.7"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["2001:db8:1:2::a", "2001:db8:1:2::/64"],
    ["2001:0DB8:0001:0002:0000:0000:0000:000a", "2001:db8:1:2::/64"],
    ["::1", "0:0:0:0::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["64:ff9b::203.0.113.7", "64:ff9b:0:0::/64"],
    ["not an address", "unknown"],
    [undefined, "unknown"],
  ])("%s is %s", (address, key) => {
    expect(addressKey(address)).toBe(key);
  });
});
