import { buildModules, getRedisUrl, has, type Env } from "../modules";

const TRANSLATION = "@medusajs/medusa/translation";
const NOTIFICATION = "@medusajs/medusa/notification";
const EVENT_BUS = "@medusajs/medusa/event-bus-redis";
const WORKFLOW_ENGINE = "@medusajs/medusa/workflow-engine-redis";
const LOCKING = "@medusajs/medusa/locking";
const CACHING = "@medusajs/medusa/caching";
const PAYLOAD = "./src/modules/payload";

const REDIS_URL = "redis://localhost:6380";

const resolves = (env: Env): unknown[] =>
  buildModules(env).map((entry) => (entry as { resolve?: unknown }).resolve);

const entry = (env: Env, resolve: string) => {
  const found = buildModules(env).find(
    (candidate) => (candidate as { resolve?: unknown }).resolve === resolve,
  );
  if (!found) {
    throw new Error(`${resolve} is not registered`);
  }
  return found as { options: Record<string, unknown> & { providers?: Record<string, unknown>[] } };
};

describe("buildModules", () => {
  describe("env cases from the plan", () => {
    it("registers translation and notification only when the env is empty", () => {
      expect(resolves({})).toEqual([TRANSLATION, NOTIFICATION]);
    });

    it("adds the three Redis modules when REDIS_URL is set", () => {
      expect(resolves({ REDIS_URL })).toEqual([
        TRANSLATION,
        NOTIFICATION,
        EVENT_BUS,
        WORKFLOW_ENGINE,
        LOCKING,
      ]);
    });

    it("adds caching when REDIS_URL and MEDUSA_FF_CACHING are both set", () => {
      expect(resolves({ REDIS_URL, MEDUSA_FF_CACHING: "true" })).toEqual([
        TRANSLATION,
        NOTIFICATION,
        EVENT_BUS,
        WORKFLOW_ENGINE,
        LOCKING,
        CACHING,
      ]);
    });
  });

  describe("Redis", () => {
    it("treats a blank REDIS_URL as unset", () => {
      expect(resolves({ REDIS_URL: "" })).toEqual([TRANSLATION, NOTIFICATION]);
      expect(resolves({ REDIS_URL: "   " })).toEqual([TRANSLATION, NOTIFICATION]);
    });

    it("passes the URL to every Redis module in the shape its module expects", () => {
      const env = { REDIS_URL, MEDUSA_FF_CACHING: "true" };

      expect(entry(env, EVENT_BUS).options).toEqual({ redisUrl: REDIS_URL });
      expect(entry(env, WORKFLOW_ENGINE).options).toEqual({ redis: { redisUrl: REDIS_URL } });
      expect(entry(env, LOCKING).options.providers).toEqual([
        {
          resolve: "@medusajs/medusa/locking-redis",
          id: "locking-redis",
          is_default: true,
          options: { redisUrl: REDIS_URL },
        },
      ]);
      expect(entry(env, CACHING).options.providers).toEqual([
        {
          resolve: "@medusajs/medusa/caching-redis",
          id: "caching-redis",
          is_default: true,
          options: { redisUrl: REDIS_URL },
        },
      ]);
    });

    it("trims the URL", () => {
      expect(entry({ REDIS_URL: `  ${REDIS_URL}\n` }, EVENT_BUS).options).toEqual({
        redisUrl: REDIS_URL,
      });
    });
  });

  describe("caching", () => {
    it("stays off without REDIS_URL, so it never registers without a provider", () => {
      expect(resolves({ MEDUSA_FF_CACHING: "true" })).toEqual([TRANSLATION, NOTIFICATION]);
    });

    it("stays off unless MEDUSA_FF_CACHING is the string true, as Medusa reads the flag", () => {
      for (const value of ["", "false", "1", "yes", "0"]) {
        expect(resolves({ REDIS_URL, MEDUSA_FF_CACHING: value })).not.toContain(CACHING);
      }
      expect(resolves({ REDIS_URL, MEDUSA_FF_CACHING: "TRUE" })).toContain(CACHING);
    });

    it("never enables the in-memory provider", () => {
      const { options } = entry({ REDIS_URL, MEDUSA_FF_CACHING: "true" }, CACHING);
      expect(options).not.toHaveProperty("in_memory");
    });
  });

  describe("notification", () => {
    it("registers the local provider for email and for feed, with or without Redis", () => {
      for (const env of [{}, { REDIS_URL }]) {
        const { providers } = entry(env, NOTIFICATION).options;
        expect(providers).toEqual([
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: { name: "Local Notification Provider", channels: ["email", "feed"] },
          },
        ]);
      }
    });
  });

  describe("payload (D75)", () => {
    const PAYLOAD_ENV = { PAYLOAD_SERVER_URL: " http://localhost:8000 ", PAYLOAD_API_KEY: "key-1" };

    it("registers the sync only with both the server URL and the API key", () => {
      expect(resolves(PAYLOAD_ENV)).toEqual([TRANSLATION, PAYLOAD, NOTIFICATION]);
      expect(resolves({ PAYLOAD_SERVER_URL: "http://localhost:8000" })).not.toContain(PAYLOAD);
      expect(resolves({ PAYLOAD_API_KEY: "key-1" })).not.toContain(PAYLOAD);
      expect(resolves({ ...PAYLOAD_ENV, PAYLOAD_API_KEY: " " })).not.toContain(PAYLOAD);
    });

    it("passes the trimmed values, and the integrations collection by default", () => {
      expect(entry(PAYLOAD_ENV, PAYLOAD).options).toEqual({
        serverUrl: "http://localhost:8000",
        apiKey: "key-1",
        userCollection: "integrations",
      });
      expect(
        entry({ ...PAYLOAD_ENV, PAYLOAD_USER_COLLECTION: "machines" }, PAYLOAD).options
          .userCollection,
      ).toBe("machines");
    });
  });

  describe("purity", () => {
    it("reads only the env it is given, never process.env", () => {
      const before = process.env.REDIS_URL;
      process.env.REDIS_URL = REDIS_URL;
      try {
        expect(resolves({})).toEqual([TRANSLATION, NOTIFICATION]);
      } finally {
        if (before === undefined) {
          delete process.env.REDIS_URL;
        } else {
          process.env.REDIS_URL = before;
        }
      }
    });

    it("returns a new list each call and leaves the env alone", () => {
      const env = Object.freeze({ REDIS_URL, MEDUSA_FF_CACHING: "true" });
      const first = buildModules(env);
      const second = buildModules(env);

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(env).toEqual({ REDIS_URL, MEDUSA_FF_CACHING: "true" });
    });

    it("has no empty entries and no duplicates", () => {
      const list = resolves({ REDIS_URL, MEDUSA_FF_CACHING: "true" });

      expect(list.every(Boolean)).toBe(true);
      expect(new Set(list).size).toBe(list.length);
    });
  });
});

describe("has", () => {
  it("is true only when every key is set to something other than blank", () => {
    expect(has({ A: "1", B: "2" }, "A", "B")).toBe(true);
    expect(has({ A: "1" }, "A", "B")).toBe(false);
    expect(has({ A: "1", B: "" }, "A", "B")).toBe(false);
    expect(has({ A: "1", B: "  " }, "A", "B")).toBe(false);
    expect(has({ A: "1", B: undefined }, "A", "B")).toBe(false);
  });

  it("is false with no keys", () => {
    expect(has({ A: "1" })).toBe(false);
  });
});

describe("getRedisUrl", () => {
  it("returns the trimmed URL, or undefined when it is not set", () => {
    expect(getRedisUrl({ REDIS_URL: ` ${REDIS_URL} ` })).toBe(REDIS_URL);
    expect(getRedisUrl({ REDIS_URL: "" })).toBeUndefined();
    expect(getRedisUrl({})).toBeUndefined();
  });
});
