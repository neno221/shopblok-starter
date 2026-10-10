import { describe, expect, it } from "vitest";
import {
  classifyPayloadAuth,
  classifySearchField,
  compareWithMedusa,
  configChecks,
  explainPayloadFailure,
  readLocales,
  readRegions,
  type Context,
} from "./doctor-checks.ts";
import { getIntegrationStatus, type AppEnvs } from "./integrations.ts";

const dev: Context = { nodeEnv: undefined, vercel: false };

/** The two `.env` files after `pnpm bootstrap`. */
const bootstrapped: AppEnvs = {
  backend: {
    JWT_SECRET: "j",
    COOKIE_SECRET: "c",
    REDIS_URL: "redis://localhost:6380",
    PAYLOAD_API_KEY: "k",
    PAYLOAD_SERVER_URL: "http://localhost:8000",
  },
  storefront: { PAYLOAD_SECRET: "p", NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_0123" },
};

const run = (envs: AppEnvs, context: Context = dev) =>
  configChecks(envs, getIntegrationStatus(envs), context);
const find = (checks: ReturnType<typeof run>, id: string) => checks.find((c) => c.id === id);

describe("configChecks: a keyless setup after bootstrap", () => {
  const checks = run(bootstrapped);

  it("warns only about email verification", () => {
    expect(checks.filter((c) => c.level !== "ok").map((c) => c.id)).toEqual(["email-verification"]);
  });

  it("the email-verification warning names the missing Resend key", () => {
    const check = find(checks, "email-verification");
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("Sign-up requires email verification");
    expect(check?.message).toContain("no Resend key");
    expect(check?.fix).toContain("RESEND_API_KEY");
  });

  it("is ok on the secrets, the publishable key and the Payload key", () => {
    for (const id of ["secrets", "publishable-key", "payload-key"]) {
      expect(find(checks, id)?.level).toBe("ok");
    }
  });
});

describe("configChecks: email verification", () => {
  const resendKeys = { RESEND_API_KEY: "re_x", RESEND_FROM_EMAIL: "shop@example.com" };

  it("with the keys set but no provider yet, says the provider is still to come", () => {
    const check = find(
      run({
        backend: { ...bootstrapped.backend, ...resendKeys },
        storefront: { ...bootstrapped.storefront, ...resendKeys },
      }),
      "email-verification",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("keys are set");
    expect(check?.message).toContain("arrives in M6");
  });
});

describe("configChecks: the publishable key", () => {
  it("missing is a warning that says to build again", () => {
    const check = find(
      run({ backend: bootstrapped.backend, storefront: { PAYLOAD_SECRET: "p" } }),
      "publishable-key",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set");
    expect(check?.fix).toContain("build the storefront again");
  });

  it("a blank value is missing", () => {
    expect(
      find(
        run({ ...bootstrapped, storefront: { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "  " } }),
        "publishable-key",
      )?.level,
    ).toBe("warn");
  });

  it("the id of the key (apk_) is an error: it is not the token", () => {
    const check = find(
      run({ ...bootstrapped, storefront: { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "apk_01XYZ" } }),
      "publishable-key",
    );
    expect(check?.level).toBe("error");
    expect(check?.message).toContain("does not start with `pk_`");
  });

  it("never prints the key", () => {
    const check = find(run(bootstrapped), "publishable-key");
    expect(JSON.stringify(check)).not.toContain("pk_0123");
  });
});

describe("configChecks: the Payload integrations key", () => {
  it("warns when the key is not in the backend env", () => {
    const check = find(
      run({ ...bootstrapped, backend: { ...bootstrapped.backend, PAYLOAD_API_KEY: "" } }),
      "payload-key",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toBe(
      "PAYLOAD_API_KEY is not set in the backend, so the Medusa → Payload sync (M4) could not sign in to Payload.",
    );
  });

  it("names both when both are missing", () => {
    const check = find(run({ backend: {}, storefront: {} }), "payload-key");
    expect(check?.message).toContain("PAYLOAD_API_KEY and PAYLOAD_SERVER_URL are not set");
  });
});

describe("configChecks: Vercel without S3", () => {
  const vercel: Context = { nodeEnv: "production", vercel: true };

  it("warns when the environment looks like Vercel and has no S3_* keys", () => {
    const check = find(run(bootstrapped, vercel), "vercel-storage");
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("looks like Vercel");
    expect(check?.details?.[0]).toContain("S3_ENDPOINT");
  });

  it("is ok when the storefront has them", () => {
    const keys = {
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "b",
      S3_PUBLIC_URL: "https://media.example.com",
    };
    const checks = run(
      { ...bootstrapped, storefront: { ...bootstrapped.storefront, ...keys } },
      vercel,
    );
    expect(find(checks, "vercel-storage")?.level).toBe("ok");
  });

  it("is silent anywhere else", () => {
    expect(find(run(bootstrapped), "vercel-storage")).toBeUndefined();
  });
});

describe("configChecks: Redis in production", () => {
  const production: Context = { nodeEnv: "production", vercel: false };

  it("names the in-memory modules and the events that never leave the process", () => {
    const check = find(
      run({ ...bootstrapped, backend: { ...bootstrapped.backend, REDIS_URL: "" } }, production),
      "redis-production",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("in-memory event bus");
    expect(check?.message).toContain("Events never leave the process");
  });

  it("is silent with REDIS_URL set, and in development", () => {
    expect(find(run(bootstrapped, production), "redis-production")).toBeUndefined();
    expect(find(run({ backend: {}, storefront: {} }, dev), "redis-production")).toBeUndefined();
  });
});

describe("configChecks: secrets", () => {
  it("blank in development is a warning that points at bootstrap", () => {
    const check = find(run({ backend: {}, storefront: {} }), "secrets");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "not set: JWT_SECRET (apps/backend)",
      "not set: COOKIE_SECRET (apps/backend)",
      "not set: PAYLOAD_SECRET (apps/storefront)",
    ]);
    expect(check?.fix).toContain("pnpm bootstrap");
  });

  it("blank in production is an error", () => {
    const check = find(
      run({ backend: {}, storefront: {} }, { nodeEnv: "production", vercel: false }),
      "secrets",
    );
    expect(check?.level).toBe("error");
  });
});

describe("configChecks: half-configured integrations", () => {
  it("warns once for each, with what is missing per app", () => {
    const checks = run({
      backend: { ...bootstrapped.backend, STRIPE_API_KEY: "sk_test_x" },
      storefront: bootstrapped.storefront,
    });
    const check = find(checks, "integration-stripe");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "apps/backend: STRIPE_WEBHOOK_SECRET not set (payment provider)",
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY not set (Payment Element)",
    ]);
    expect(find(checks, "integration-resend")).toBeUndefined();
  });
});

describe("classifySearchField", () => {
  const stats = (field: string) => ({
    status: 200,
    body: {
      results: [{ hits: [], facets: { [field]: { type: "stats", min: 12, max: 59, count: 8 } } }],
    },
  });

  it("a stats facet on a field the index has is present (measured on Medusa 2.21.2)", () => {
    expect(classifySearchField("min_price_eur", stats("min_price_eur"))).toEqual({
      state: "present",
    });
  });

  it("the 400 for an unknown field is missing (measured: min_price_brl before db:migrate)", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 400,
        body: {
          type: "invalid_data",
          message:
            'Unknown field "min_price_brl" used in search_options.facets on search index "product"',
        },
      }),
    ).toEqual({ state: "missing" });
  });

  it("the 400 for a currency that has a region but no index field is missing (measured: Brazil seeded, no db:migrate)", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 400,
        body: {
          type: "not_allowed",
          message: 'Field "min_price_brl" is not facetable on the postgres search provider',
        },
      }),
    ).toEqual({ state: "missing" });
  });

  it("a 200 with no facet for the field is missing too", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 200,
        body: { results: [{ hits: [], facets: {} }] },
      }),
    ).toEqual({ state: "missing" });
    expect(classifySearchField("min_price_brl", { status: 200, body: {} })).toEqual({
      state: "missing",
    });
  });

  it("a message about another currency's field does not count for this one", () => {
    for (const message of [
      'Unknown field "min_price_brl" used in search_options.facets',
      'Field "min_price_brl" is not facetable on the postgres search provider',
    ]) {
      expect(classifySearchField("min_price_eur", { status: 400, body: { message } }).state).toBe(
        "unknown",
      );
    }
  });

  it("any other answer is unknown, with what Medusa said (it may be a changed request shape)", () => {
    const result = classifySearchField("min_price_eur", {
      status: 400,
      body: { type: "invalid_data", message: "Invalid request: Field 'queries' is required" },
    });
    expect(result).toEqual({
      state: "unknown",
      detail: "HTTP 400: Invalid request: Field 'queries' is required",
    });
    expect(classifySearchField("min_price_eur", { status: 500, body: undefined })).toEqual({
      state: "unknown",
      detail: "HTTP 500",
    });
  });
});

describe("readRegions and readLocales", () => {
  it("reads the regions with the countries' ISO codes", () => {
    expect(
      readRegions({
        status: 200,
        body: {
          regions: [
            {
              name: "Europe",
              currency_code: "eur",
              countries: [{ iso_2: "cy" }, { iso_2: "fr" }],
            },
          ],
        },
      }),
    ).toEqual([{ name: "Europe", currency: "eur", countries: ["cy", "fr"] }]);
  });

  it("a 400 is the publishable key being refused", () => {
    expect(
      readRegions({
        status: 400,
        body: { type: "not_allowed", message: "A valid publishable key is required" },
      }),
    ).toBe("Medusa refused the publishable key (HTTP 400)");
    expect(readRegions({ status: 500, body: null })).toBe("HTTP 500");
    expect(readRegions({ status: 200, body: {} })).toContain("no `regions` list");
  });

  it("reads the locale codes", () => {
    expect(
      readLocales({
        status: 200,
        body: { locales: [{ code: "en-US", name: "English" }, { code: "el-GR" }] },
      }),
    ).toEqual(["en-US", "el-GR"]);
    expect(readLocales({ status: 404, body: null })).toBe("HTTP 404");
  });
});

describe("compareWithMedusa", () => {
  const map = {
    countries: [
      { code: "cy", enabled: true, languages: ["el"] },
      { code: "br", enabled: true, languages: ["pt"] },
      { code: "xx", enabled: false, languages: ["en"] },
    ],
    languages: [
      { code: "el", medusaLocale: "el-GR" },
      { code: "pt", medusaLocale: "pt-BR" },
    ],
  };

  it("agrees when every open country has a region and every language a locale", () => {
    expect(
      compareWithMedusa(
        {
          regions: [
            { name: "Europe", currency: "eur", countries: ["cy"] },
            { name: "Brazil", currency: "brl", countries: ["br"] },
          ],
          locales: ["el-GR", "pt-BR"],
        },
        map,
      ),
    ).toEqual([]);
  });

  it("a market added to the map but not applied to Medusa (the bootstrap was forgotten)", () => {
    expect(
      compareWithMedusa(
        { regions: [{ name: "Europe", currency: "eur", countries: ["cy"] }], locales: ["el-GR"] },
        map,
      ),
    ).toEqual([
      'Medusa has no region for the open country "br"',
      'Medusa\'s store has no locale "pt-BR" (language "pt")',
    ]);
  });
});

describe("classifyPayloadAuth", () => {
  it("the integrations user is ok", () => {
    expect(
      classifyPayloadAuth({ status: 200, body: { user: { collection: "integrations" } } }),
    ).toBe("ok");
  });

  it("a user of another collection is not the integration", () => {
    expect(classifyPayloadAuth({ status: 200, body: { user: { collection: "users" } } })).toBe(
      "unknown",
    );
  });

  it("no user, or a refusal, is rejected", () => {
    expect(classifyPayloadAuth({ status: 200, body: { user: null } })).toBe("rejected");
    expect(classifyPayloadAuth({ status: 401, body: {} })).toBe("rejected");
    expect(classifyPayloadAuth({ status: 403, body: {} })).toBe("rejected");
  });

  it("anything else is unknown", () => {
    expect(classifyPayloadAuth({ status: 500, body: undefined })).toBe("unknown");
  });
});

describe("explainPayloadFailure", () => {
  it("knows the causes bootstrap fixes", () => {
    expect(
      explainPayloadFailure(
        'Error: cannot connect to Postgres. Details: database "payload" does not exist',
      ).cause,
    ).toBe("the payload database does not exist");
    expect(explainPayloadFailure('error: relation "markets" does not exist').cause).toBe(
      "the payload database is not migrated",
    );
    expect(
      explainPayloadFailure("Error: missing secret key. A secret key is needed to secure Payload.")
        .cause,
    ).toContain("PAYLOAD_SECRET");
    expect(
      explainPayloadFailure("password authentication failed for user postgres").cause,
    ).toContain("could not connect");
  });

  it("falls back to the last line of the log, without stack frames", () => {
    const result = explainPayloadFailure("first\nTypeError: boom\n    at foo (bar.ts:1:1)\n");
    expect(result.cause).toBe("Payload failed: TypeError: boom");
  });

  it("copes with no output", () => {
    expect(explainPayloadFailure("").cause).toBe("Payload failed without a message");
  });
});
