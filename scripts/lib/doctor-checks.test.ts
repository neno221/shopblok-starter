import { describe, expect, it } from "vitest";
import {
  classifyPayloadAuth,
  classifySearchField,
  compareWithMedusa,
  configChecks,
  explainPayloadFailure,
  explainPayloadRun,
  medusaMarketsCheck,
  orphanRegions,
  orphanRegionsCheck,
  payloadAuthCheck,
  readLocales,
  readRegions,
  searchCurrencies,
  searchFieldOf,
  searchIndexCheck,
  type Context,
  type LiveRegion,
} from "./doctor-checks.ts";
import type { HttpResult } from "./http.ts";
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
  storefront: {
    PAYLOAD_SECRET: "p",
    PREVIEW_SECRET: "v",
    CRON_SECRET: "r",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_0123",
  },
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

  // The backend takes a blank secret only for NODE_ENV "", development and test
  // (`DEFAULT_SECRET_ENVS`, apps/backend/src/config/config.ts); anything else refuses to start.
  const secretsFor = (nodeEnv: string) =>
    find(run({ backend: {}, storefront: {} }, { nodeEnv, vercel: false }), "secrets");

  it.each(["staging", "preview", "Production"])("blank with NODE_ENV=%s is an error too", (env) => {
    expect(secretsFor(env)?.level).toBe("error");
    expect(secretsFor(env)?.message).toContain(`NODE_ENV is ${env}`);
  });

  it.each(["development", "test"])("blank with NODE_ENV=%s is only a warning", (env) => {
    expect(secretsFor(env)?.level).toBe("warn");
  });
});

describe("configChecks: the preview and jobs secrets (T59)", () => {
  const blank = { backend: bootstrapped.backend, storefront: { PAYLOAD_SECRET: "p" } };

  it("set after bootstrap", () => {
    expect(find(run(bootstrapped), "preview-cron-secrets")?.level).toBe("ok");
  });

  it("blank in development is a warning that names both and points at bootstrap", () => {
    const check = find(run(blank), "preview-cron-secrets");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "not set: PREVIEW_SECRET (apps/storefront)",
      "not set: CRON_SECRET (apps/storefront)",
    ]);
    expect(check?.fix).toContain("pnpm bootstrap");
  });

  it("blank in production is an error", () => {
    const check = find(run(blank, { nodeEnv: "production", vercel: false }), "preview-cron-secrets");
    expect(check?.level).toBe("error");
    expect(check?.fix).toContain("Vercel Cron");
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

  it("a 200 that is not Payload's JSON says nothing about the key (a proxy's page, another app)", () => {
    expect(classifyPayloadAuth({ status: 200, body: undefined })).toBe("unknown");
    expect(classifyPayloadAuth({ status: 200, body: null })).toBe("unknown");
    expect(classifyPayloadAuth({ status: 200, body: {} })).toBe("unknown");
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

describe("explainPayloadRun", () => {
  const run = { code: 1, output: "", timedOut: false };

  it("says when pnpm could not be started, not 'failed without a message'", () => {
    const why = explainPayloadRun({
      ...run,
      code: null,
      error: "spawn pnpm ENOENT",
    });
    expect(why.cause).toBe("pnpm could not be started (spawn pnpm ENOENT)");
    expect(why.fix).toContain("PATH");
  });

  it("says what Payload asked, and that it ran out of time", () => {
    expect(explainPayloadRun({ ...run, prompt: "Continue? (y/N)" }).cause).toBe(
      'Payload asked "Continue? (y/N)"',
    );
    expect(explainPayloadRun({ ...run, code: null, timedOut: true }).cause).toBe(
      "Payload did not start within 60 s",
    );
  });

  it("reads the log otherwise, and names the exit when the log is empty", () => {
    expect(explainPayloadRun({ ...run, output: 'database "payload" does not exist' }).cause).toBe(
      "the payload database does not exist",
    );
    expect(explainPayloadRun(run).cause).toBe("Payload failed without a message (exit code 1)");
    expect(explainPayloadRun({ ...run, code: null }).cause).toBe(
      "Payload failed without a message (stopped by a signal)",
    );
  });
});

describe("compareWithMedusa without locales", () => {
  it("does not call a language missing when the locales could not be read", () => {
    const map = {
      countries: [{ code: "cy", enabled: true, languages: ["el"] }],
      languages: [{ code: "el", medusaLocale: "el-GR" }],
    };
    const regions = [{ name: "Europe", currency: "eur", countries: ["cy"] }];
    expect(compareWithMedusa({ regions }, map)).toEqual([]);
    expect(compareWithMedusa({ regions, locales: [] }, map)).toHaveLength(1);
  });
});

describe("orphanRegions", () => {
  const config = {
    currencies: ["eur", "usd"],
    regions: [
      { name: "Europe", currency: "eur", countries: ["cy", "de"] },
      { name: "United States", currency: "usd", countries: ["us"] },
    ],
    locales: ["en-US"],
  };

  it("finds a region whose countries the file no longer lists (a market taken out of config/markets.ts)", () => {
    const live = [
      { name: "Europe", currency: "eur", countries: ["cy", "de"] },
      { name: "Brazil", currency: "brl", countries: ["br"] },
    ];
    expect(orphanRegions(live, config)).toEqual([
      { name: "Brazil", currency: "brl", countries: ["br"] },
    ]);
  });

  it("an admin's rename does not hide it, or create one", () => {
    expect(
      orphanRegions([{ name: "EU shop", currency: "eur", countries: ["cy", "de"] }], config),
    ).toEqual([]);
  });

  it("a region that shares even one country with the file is not an orphan", () => {
    expect(
      orphanRegions([{ name: "Europe+", currency: "eur", countries: ["cy", "br"] }], config),
    ).toEqual([]);
  });

  it("a region with no countries is not counted", () => {
    expect(orphanRegions([{ name: "Empty", currency: "brl", countries: [] }], config)).toEqual([]);
  });
});

// ---- --online: the checks, from fabricated answers ---------------------------------------------

const json = (body: unknown, status = 200): HttpResult => ({
  kind: "response",
  status,
  text: JSON.stringify(body),
});
const refused: HttpResult = { kind: "refused" };
const timedOut: HttpResult = {
  kind: "unreachable",
  reason: "no answer within 15 s",
};

describe("payloadAuthCheck", () => {
  const url = "http://localhost:8000";

  it("warns when there was no URL or key to ask with", () => {
    expect(payloadAuthCheck(url, undefined)).toMatchObject({
      id: "payload-auth",
      level: "warn",
      fix: "Run `pnpm bootstrap`.",
    });
  });

  it("warns, naming the reason, when Payload does not answer", () => {
    expect(payloadAuthCheck(url, refused).message).toBe(
      "not checked: http://localhost:8000 is not running.",
    );
    expect(payloadAuthCheck(url, timedOut).message).toContain("does not answer (no answer");
  });

  it("is ok for the integrations user", () => {
    const answer = json({ user: { collection: "integrations" } });
    expect(payloadAuthCheck(url, answer).level).toBe("ok");
  });

  it("blames the key only when Payload says it does not know it", () => {
    const rejected = payloadAuthCheck(url, json({ user: null }));
    expect(rejected.level).toBe("error");
    expect(rejected.message).toContain("does not accept PAYLOAD_API_KEY");
    expect(rejected.fix).toContain("pnpm bootstrap");
  });

  it("blames the address, not the key, for a 200 that is not Payload's JSON", () => {
    const html: HttpResult = {
      kind: "response",
      status: 200,
      text: "<html>Welcome</html>",
    };
    const check = payloadAuthCheck(url, html);
    expect(check.level).toBe("error");
    expect(check.message).toBe(`GET ${url}/api/integrations/me answered HTTP 200, not a user.`);
    expect(check.message).not.toContain("PAYLOAD_API_KEY");
    expect(check.fix).toContain("PAYLOAD_SERVER_URL");
  });
});

describe("medusaMarketsCheck", () => {
  const url = "http://localhost:9000";
  const map = {
    countries: [
      { code: "cy", enabled: true, languages: ["el"] },
      { code: "br", enabled: true, languages: ["pt"] },
    ],
    languages: [
      { code: "el", medusaLocale: "el-GR" },
      { code: "pt", medusaLocale: "pt-BR" },
    ],
  };
  const regions = json({
    regions: [
      { name: "Europe", currency_code: "eur", countries: [{ iso_2: "cy" }] },
      { name: "Brazil", currency_code: "brl", countries: [{ iso_2: "br" }] },
    ],
  });
  const locales = json({ locales: [{ code: "el-GR" }, { code: "pt-BR" }] });

  it("warns that nothing was asked when the storefront has no publishable key", () => {
    const { check, regions: live } = medusaMarketsCheck(url, undefined, map);
    expect(check).toMatchObject({ id: "medusa-markets", level: "warn" });
    expect(live).toBeUndefined();
  });

  it("warns, and goes no further, when Medusa does not answer", () => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions: refused, locales }, map);
    expect(check.message).toBe("not checked: Medusa at http://localhost:9000 is not running.");
    expect(live).toBeUndefined();
  });

  it("is an error when Medusa refuses the key", () => {
    const refusedKey = json({ message: "x" }, 400);
    const { check } = medusaMarketsCheck(url, { regions: refusedKey, locales }, map);
    expect(check.level).toBe("error");
    expect(check.message).toContain("Medusa refused the publishable key");
  });

  it("is ok when every open country has a region and every language a locale", () => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions, locales }, map);
    expect(check).toEqual({
      id: "medusa-markets",
      title: "Medusa matches the storefront's map",
      level: "ok",
      message: "2 regions and 2 locales cover every open country and language.",
    });
    expect(live).toHaveLength(2);
  });

  it("lists what Medusa lacks", () => {
    const { check } = medusaMarketsCheck(url, { regions, locales: json({ locales: [] }) }, map);
    expect(check.level).toBe("warn");
    expect(check.details).toEqual([
      'Medusa\'s store has no locale "el-GR" (language "el")',
      'Medusa\'s store has no locale "pt-BR" (language "pt")',
    ]);
  });

  // Found by the review of T14: the whole check used to vanish when /store/locales failed.
  it.each([
    ["HTTP 404", json({ message: "Not found" }, 404), "HTTP 404"],
    ["a timeout", timedOut, "Medusa does not answer (no answer within 15 s)"],
    ["a refusal", refused, "Medusa is not running"],
  ])("still reports, with the reason, when /store/locales fails with %s", (_name, bad, reason) => {
    const { check } = medusaMarketsCheck(url, { regions, locales: bad }, map);
    expect(check).toMatchObject({ id: "medusa-markets", level: "warn" });
    expect(check.details?.join("\n")).toContain(reason);
  });

  it("still compares the regions when the locales cannot be read", () => {
    const onlyEurope = json({
      regions: [{ name: "Europe", currency_code: "eur", countries: [{ iso_2: "cy" }] }],
    });
    const { check } = medusaMarketsCheck(url, { regions: onlyEurope, locales: timedOut }, map);
    expect(check.message).toContain("does not have what the storefront's map expects");
    expect(check.details).toContain('Medusa has no region for the open country "br"');
  });

  it("says so when there is no map to compare with, and still hands back the regions", () => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions, locales }, undefined);
    expect(check).toMatchObject({ id: "medusa-markets", level: "warn" });
    expect(check.message).toContain("no market map could be read");
    expect(live).toHaveLength(2);
  });
});

describe("orphanRegionsCheck and searchCurrencies", () => {
  const europe: LiveRegion = { name: "Europe", currency: "eur", countries: ["cy"] };
  const brazil: LiveRegion = { name: "Brazil", currency: "brl", countries: ["br"] };
  const germany: LiveRegion = { name: "Germany", currency: "eur", countries: ["de"] };

  it("is silent with no leftover region, and names each leftover one", () => {
    expect(orphanRegionsCheck([])).toBeUndefined();
    const check = orphanRegionsCheck([brazil]);
    expect(check).toMatchObject({ id: "medusa-orphans", level: "warn" });
    expect(check?.message).toContain("a region");
    expect(check?.details).toEqual(['"Brazil" (brl): br']);
    expect(orphanRegionsCheck([brazil, europe])?.message).toContain("regions that");
  });

  it("asks about the currencies of the regions in the file, not of a leftover one", () => {
    expect(searchCurrencies([europe, brazil], [brazil])).toEqual(["eur"]);
  });

  it("keeps a currency that a leftover region shares with one in the file", () => {
    expect(searchCurrencies([europe, germany], [germany])).toEqual(["eur"]);
  });

  it("asks once about a currency two regions share, and never about a blank one", () => {
    const blank: LiveRegion = { name: "Odd", currency: "", countries: ["xx"] };
    expect(searchCurrencies([europe, germany, blank], [])).toEqual(["eur"]);
  });
});

describe("searchFieldOf and searchIndexCheck", () => {
  const present = { state: "present" } as const;
  const missing = { state: "missing" } as const;

  it("reads the field of the currency out of Medusa's answer", () => {
    const facets = json({
      results: [{ facets: { min_price_eur: { type: "stats" } } }],
    });
    expect(searchFieldOf("eur", facets)).toEqual({ state: "present" });
    expect(searchFieldOf("brl", facets)).toEqual({ state: "missing" });
    expect(searchFieldOf("eur", refused)).toEqual({
      state: "unknown",
      detail: "Medusa did not answer",
    });
  });

  it("is ok, naming the currencies, when every field is there", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: present },
      { currency: "usd", state: present },
    ]);
    expect(check).toMatchObject({ id: "search-index", level: "ok" });
    expect(check.message).toBe("min_price_<currency> exists for eur, usd.");
  });

  it("warns about the currencies the index lacks, and says to migrate", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: present },
      { currency: "brl", state: missing },
    ]);
    expect(check.level).toBe("warn");
    expect(check.message).toContain(
      "regions in brl, but the search index has no price fields for it",
    );
    expect(check.fix).toContain("medusa db:migrate");
  });

  it("warns, with what Medusa said, when the answer does not tell", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: { state: "unknown", detail: "HTTP 500" } },
    ]);
    expect(check.level).toBe("warn");
    expect(check.details).toEqual(["eur: HTTP 500"]);
  });

  // Found by the review of T14: an empty list used to give a green tick for "exists for .".
  it("does not vouch for a currency list that is empty", () => {
    const check = searchIndexCheck([]);
    expect(check.level).toBe("warn");
    expect(check.message).toContain("not checked");
    expect(check.message).not.toContain("exists for");
  });
});
