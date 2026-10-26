import { buildConfig, getSecret } from "../config";
import { buildModules, type Env } from "../modules";

const REDIS_URL = "redis://localhost:6380";

const http = (env: Env) => buildConfig(env).projectConfig?.http;

describe("getSecret", () => {
  it("returns a set secret under every NODE_ENV", () => {
    for (const NODE_ENV of [
      undefined,
      "",
      "development",
      "test",
      "staging",
      "production",
      "prod",
    ]) {
      expect(getSecret({ NODE_ENV, JWT_SECRET: "s3cret" }, "JWT_SECRET")).toBe("s3cret");
    }
  });

  it("turns a blank secret into undefined where Medusa may use its default", () => {
    for (const NODE_ENV of [undefined, "", "development", "test"]) {
      expect(getSecret({ NODE_ENV, JWT_SECRET: "" }, "JWT_SECRET")).toBeUndefined();
      expect(getSecret({ NODE_ENV }, "JWT_SECRET")).toBeUndefined();
    }
  });

  it("keeps a blank secret blank anywhere else, so a staging deploy can't use the default", () => {
    for (const NODE_ENV of ["staging", "production", "prod"]) {
      expect(getSecret({ NODE_ENV, JWT_SECRET: "" }, "JWT_SECRET")).toBe("");
    }
  });
});

describe("buildConfig", () => {
  describe("projectConfig", () => {
    it("passes the database URL and the three CORS lists through", () => {
      const env = {
        DATABASE_URL: "postgres://localhost/medusa",
        STORE_CORS: "http://localhost:8000",
        ADMIN_CORS: "http://localhost:9000",
        AUTH_CORS: "http://localhost:8000,http://localhost:9000",
      };

      expect(buildConfig(env).projectConfig).toMatchObject({
        databaseUrl: env.DATABASE_URL,
        http: { storeCors: env.STORE_CORS, adminCors: env.ADMIN_CORS, authCors: env.AUTH_CORS },
      });
    });

    it("reads both secrets, blank ones as in .env.example", () => {
      expect(http({ JWT_SECRET: "", COOKIE_SECRET: "" })).toMatchObject({
        jwtSecret: undefined,
        cookieSecret: undefined,
      });
      expect(http({ JWT_SECRET: "a", COOKIE_SECRET: "b" })).toMatchObject({
        jwtSecret: "a",
        cookieSecret: "b",
      });
      expect(http({ NODE_ENV: "staging", JWT_SECRET: "", COOKIE_SECRET: "" })).toMatchObject({
        jwtSecret: "",
        cookieSecret: "",
      });
    });

    it("sets redisUrl for sessions only when REDIS_URL is set, trimmed", () => {
      expect(buildConfig({}).projectConfig).not.toHaveProperty("redisUrl");
      expect(buildConfig({ REDIS_URL: ` ${REDIS_URL}\n` }).projectConfig?.redisUrl).toBe(REDIS_URL);
    });
  });

  it("requires e-mail verification of customers who sign up with a password, always (D64)", () => {
    for (const env of [{}, { NODE_ENV: "production" }]) {
      expect(buildConfig(env).projectConfig?.http?.authVerificationsPerActor).toEqual({
        customer: [{ entity_type: "email", auth_provider: "emailpass" }],
      });
    }
  });

  it("takes the admin's storefront URL from STOREFRONT_URL", () => {
    expect(buildConfig({ STOREFRONT_URL: "http://localhost:8000" }).admin?.storefrontUrl).toBe(
      "http://localhost:8000",
    );
    expect(buildConfig({}).admin?.storefrontUrl).toBeUndefined();
  });

  it("turns the translation flag on", () => {
    expect(buildConfig({}).featureFlags).toEqual({ translation: true });
  });

  it("uses the module list buildModules gives for the same env", () => {
    const env = { REDIS_URL, MEDUSA_FF_CACHING: "true" };

    expect(buildConfig(env).modules).toEqual(buildModules(env));
  });

  it("reads only the env it is given, never process.env", () => {
    const processEnv = jest.replaceProperty(process, "env", { REDIS_URL });
    try {
      expect(buildConfig({}).projectConfig).not.toHaveProperty("redisUrl");
    } finally {
      processEnv.restore();
    }
  });
});
