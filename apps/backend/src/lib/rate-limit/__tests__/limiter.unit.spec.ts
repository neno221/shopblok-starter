import { createServer, type AddressInfo } from "node:net";

import { addressKey } from "../address";
import { emailKey, Limiter } from "../limiter";
import { RULES, STOREFRONT_RULES, isStorefrontRule } from "../rules";
import { MemoryStore, RedisStore, throttledWarn, WARN_EVERY_MS } from "../store";

const fresh = () => {
  let now = 1_000_000;
  const store = new MemoryStore(() => now);
  return { limiter: new Limiter(store), advance: (ms: number) => (now += ms) };
};

const times = async (n: number, run: () => Promise<{ allowed: boolean }>) => {
  const results: boolean[] = [];
  for (let i = 0; i < n; i += 1) results.push((await run()).allowed);
  return results;
};

describe("the limits table (D142)", () => {
  it("has D142's defaults", () => {
    const limits = Object.fromEntries(
      Object.values(RULES).flatMap((rule) =>
        rule.counters.map((c) => [c.id, [c.limit, c.windowMs / 60_000, c.scope]]),
      ),
    );
    expect(limits).toEqual({
      "customer-login:address-email": [10, 15, "address-key"],
      "customer-login:address": [30, 15, "address"],
      "customer-register:address": [5, 60, "address"],
      "customer-reset:address": [5, 60, "address"],
      "customer-reset:email": [3, 60, "key"],
      "verification-request:email": [5, 60, "key"],
      "verification-request:address": [20, 60, "address"],
      "verification-confirm:address": [20, 60, "address"],
      "admin-login:address-email": [10, 15, "address-key"],
      "admin-login:address": [30, 15, "address"],
      "admin-reset:address": [5, 60, "address"],
      "admin-reset:email": [3, 60, "key"],
      "admin-code-check:user": [5, 15, "key"],
      "cart-complete:cart": [10, 10, "key"],
      "cart-complete:address": [30, 10, "address"],
      "store:address": [600, 1, "address"],
      "form:address-form": [10, 60, "address-key"],
      "newsletter:address": [5, 60, "address"],
      "newsletter:email": [2, 1440, "key"],
      "consent:address": [30, 60, "address"],
      "payload-login:address-email": [10, 15, "address-key"],
      "payload-login:address": [30, 15, "address"],
      "payload-reset:email": [3, 60, "key"],
      "form-no-script:address": [1, 60, "address"],
    });
  });

  it("lets the storefront consume its own rules only", () => {
    expect(STOREFRONT_RULES).toEqual([
      "form",
      "newsletter",
      "consent",
      "payload-login",
      "payload-reset",
      "form-no-script",
    ]);
    expect(isStorefrontRule("customer-login")).toBe(false);
    expect(isStorefrontRule("store")).toBe(false);
    expect(isStorefrontRule("toString")).toBe(false);
  });
});

describe("the limiter", () => {
  it("refuses the 11th login for one address and e-mail, with the window's wait", async () => {
    const { limiter } = fresh();
    const caller = { address: "203.0.113.7", key: emailKey("Ann@Example.com") };
    const results = await times(10, () => limiter.consume("customer-login", caller));
    expect(results.every(Boolean)).toBe(true);
    expect(await limiter.consume("customer-login", caller)).toEqual({
      allowed: false,
      retryAfterSeconds: 900,
    });
    // Another address with the same e-mail, and the same address with another e-mail, pass.
    expect(
      (await limiter.consume("customer-login", { ...caller, address: "198.51.100.1" })).allowed,
    ).toBe(true);
    expect(
      (await limiter.consume("customer-login", { ...caller, key: emailKey("bo@example.com") }))
        .allowed,
    ).toBe(true);
  });

  it("refuses the 31st login from one address across e-mails", async () => {
    const { limiter } = fresh();
    const results = await times(31, async () =>
      limiter.consume("customer-login", {
        address: "203.0.113.7",
        key: emailKey(`n${Math.random()}@example.com`),
      }),
    );
    expect(results.slice(0, 30).every(Boolean)).toBe(true);
    expect(results[30]).toBe(false);
  });

  it("opens again when the window ends", async () => {
    const { limiter, advance } = fresh();
    const caller = { address: "203.0.113.7" };
    await times(5, () => limiter.consume("customer-register", caller));
    expect((await limiter.consume("customer-register", caller)).allowed).toBe(false);
    advance(30 * 60_000);
    expect(await limiter.consume("customer-register", caller)).toEqual({
      allowed: false,
      retryAfterSeconds: 1800,
    });
    advance(30 * 60_000);
    expect((await limiter.consume("customer-register", caller)).allowed).toBe(true);
  });

  it("lets `server` skip the per-address counters, never the per-cart one", async () => {
    const { limiter } = fresh();
    const store = await times(700, () => limiter.consume("store", { address: "server" }));
    expect(store.every(Boolean)).toBe(true);
    const cart = await times(11, () =>
      limiter.consume("cart-complete", { address: "server", key: "cart_1" }),
    );
    expect(cart.slice(0, 10).every(Boolean)).toBe(true);
    expect(cart[10]).toBe(false);
  });

  it("keys an IPv6 visitor by the /64", async () => {
    const { limiter } = fresh();
    await times(5, () => limiter.consume("customer-register", { address: "2001:db8:1:2::a" }));
    expect(
      (await limiter.consume("customer-register", { address: "2001:db8:1:2:ffff::1" })).allowed,
    ).toBe(false);
    expect(
      (await limiter.consume("customer-register", { address: "2001:db8:1:3::a" })).allowed,
    ).toBe(true);
  });

  it("lets requests through when the store cannot count", async () => {
    const limiter = new Limiter({ hit: async () => undefined });
    const results = await times(50, () =>
      limiter.consume("form-no-script", { address: "203.0.113.7" }),
    );
    expect(results.every(Boolean)).toBe(true);
  });
});

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

describe("the Redis store, on a fresh process", () => {
  it("counts the first hit once the connection is up, with no outage warning", async () => {
    // A stand-in Redis that answers every command with the script's reply: count 1, 60 s left.
    const server = createServer((socket) => {
      socket.on("data", (chunk) => {
        const commands = chunk.toString("latin1").match(/\*\d+\r\n\$/g)?.length ?? 0;
        for (let i = 0; i < commands; i += 1) socket.write("*2\r\n:1\r\n:60000\r\n");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const warnings: string[] = [];
    const store = new RedisStore(`redis://127.0.0.1:${port}`, (message) => warnings.push(message));
    try {
      // The first hit comes while ioredis is still connecting.
      expect(await store.hit("rl:test:key", 60_000)).toEqual({ count: 1, ttlMs: 60_000 });
      expect(warnings).toEqual([]);
    } finally {
      await store.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("the Redis store, with Redis stopped", () => {
  it("answers nothing at once and warns once a minute", async () => {
    const warnings: string[] = [];
    // Port 1: nothing listens, so every connection is refused.
    const store = new RedisStore("redis://127.0.0.1:1", (message) => warnings.push(message));
    try {
      const started = Date.now();
      const hits = await Promise.all(
        Array.from({ length: 20 }, () => store.hit("rl:test:key", 60_000)),
      );
      expect(hits.every((hit) => hit === undefined)).toBe(true);
      expect(Date.now() - started).toBeLessThan(1_000);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/^rate-limit: Redis cannot be reached \(.+\); requests pass/);
    } finally {
      await store.close();
    }
  });

  it("throttles the warning to one per minute", () => {
    let now = 0;
    const said: string[] = [];
    const warn = throttledWarn((message) => said.push(message), () => now);
    warn("a");
    now += WARN_EVERY_MS - 1;
    warn("b");
    now += 1;
    warn("c");
    expect(said).toEqual(["a", "c"]);
  });
});
