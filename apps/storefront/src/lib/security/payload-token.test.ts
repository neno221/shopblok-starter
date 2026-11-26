import { createHmac } from "node:crypto";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { BasePayload, buildConfig, getFieldsToSign, jwtSign, type SanitizedConfig } from "payload";
import { beforeAll, describe, expect, it } from "vitest";
import { Integrations } from "../../payload/collections/integrations";
import { Users } from "../../payload/collections/users";
import {
  PAYLOAD_JWT_AUTH_VERSION,
  payloadSigningKey,
  STAFF_ROLES,
  verifyStaffToken,
} from "./payload-token";

// M7 D148 (4), T111: our check against Payload's own signing. Payload is started without a database
// (`disableDBConnect`), with the shop's real `users` and `integrations` collections, and its tokens
// are made the way its `login` operation makes them (`getFieldsToSign`, then `jwtSign` with
// `payload.secret` and the collection's `tokenExpiration`). If Payload changes how it derives its
// key, what it signs or how, these fail. `e2e/ds-gate.spec.ts` checks a real sign-in's cookie.

const SECRET = "t111-test-secret";

let payload: BasePayload;

beforeAll(async () => {
  const config: Promise<SanitizedConfig> = buildConfig({
    secret: SECRET,
    admin: { user: Users.slug },
    collections: [Users, Integrations],
    db: postgresAdapter({ pool: { connectionString: "postgres://nobody@127.0.0.1:1/none" } }),
    telemetry: false,
  });
  payload = new BasePayload();
  await payload.init({ config, disableDBConnect: true, disableOnInit: true });
});

/** A token exactly as Payload's `login` signs it for `user` of `collection`. */
async function payloadToken(collection: "users" | "integrations", user: Record<string, unknown>) {
  const collectionConfig = payload.collections[collection].config;
  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: String(user["email"] ?? ""),
    sid: "session-1",
    user: user as never,
  });
  const { token, exp } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  });
  return { token, exp };
}

const segment = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A token signed with our derivation of the key, with any header and claims. */
function forged(header: object, claims: object, secret = SECRET) {
  const unsigned = `${segment(header)}.${segment(claims)}`;
  const signature = createHmac("sha256", payloadSigningKey(secret))
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

const HEADER = { alg: "HS256", authVersion: PAYLOAD_JWT_AUTH_VERSION, typ: "JWT" };
const now = () => Math.floor(Date.now() / 1000);

describe("Payload 3.94's tokens", () => {
  it("derive the key as we do", () => {
    expect(payload.secret).toBe(payloadSigningKey(SECRET).toString("utf8"));
  });

  it("last two hours: users sets no tokenExpiration of its own", () => {
    expect(payload.collections.users.config.auth.tokenExpiration).toBe(7200);
  });

  it("carry the role (saveToJWT), the collection and a session id", async () => {
    const { token } = await payloadToken("users", { id: 7, email: "e@x.test", role: "editor" });
    const claims = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as Record<
      string,
      unknown
    >;
    expect(claims).toMatchObject({ id: 7, collection: "users", role: "editor", sid: "session-1" });
    expect(payload.collections.users.config.auth.useSessions).toBe(true);
  });
});

describe("verifyStaffToken", () => {
  it("accepts an admin's and an editor's token as Payload signs them", async () => {
    for (const role of STAFF_ROLES) {
      const { token, exp } = await payloadToken("users", { id: 3, email: "s@x.test", role });
      expect(verifyStaffToken(token, SECRET)).toEqual({ id: 3, role, exp, sid: "session-1" });
    }
  });

  it("refuses an integration's token, whatever its role", async () => {
    const { token } = await payloadToken("integrations", { id: 3, role: "medusa-sync" });
    expect(verifyStaffToken(token, SECRET)).toBeUndefined();
    // The same claims under a staff role name, so only the collection tells them apart.
    const claims = { id: 3, collection: "integrations", role: "admin", exp: now() + 60 };
    expect(verifyStaffToken(forged(HEADER, claims), SECRET)).toBeUndefined();
  });

  it("refuses a users token whose role is not staff", () => {
    for (const role of [undefined, "", "medusa-sync", "Admin"]) {
      const claims = { id: 1, collection: "users", role, exp: now() + 60 };
      expect(verifyStaffToken(forged(HEADER, claims), SECRET), String(role)).toBeUndefined();
    }
  });

  it("refuses an expired token, and one at its very second", async () => {
    const { token, exp } = await payloadToken("users", { id: 1, email: "a@x.test", role: "admin" });
    expect(verifyStaffToken(token, SECRET, exp - 1)).toBeDefined();
    expect(verifyStaffToken(token, SECRET, exp)).toBeUndefined();
    expect(verifyStaffToken(token, SECRET, exp + 3600)).toBeUndefined();
    const noExp = { id: 1, collection: "users", role: "admin" };
    expect(verifyStaffToken(forged(HEADER, noExp), SECRET)).toBeUndefined();
    const later = { ...noExp, exp: now() + 60, nbf: now() + 30 };
    expect(verifyStaffToken(forged(HEADER, later), SECRET)).toBeUndefined();
  });

  it("refuses a tampered token, another key and another algorithm or version", async () => {
    const { token } = await payloadToken("users", { id: 1, email: "a@x.test", role: "editor" });
    const [header, , signature] = token.split(".") as [string, string, string];
    const promoted = segment({ id: 1, collection: "users", role: "admin", exp: now() + 60 });
    expect(verifyStaffToken(`${header}.${promoted}.${signature}`, SECRET)).toBeUndefined();
    expect(verifyStaffToken(token, "another-secret")).toBeUndefined();
    const claims = { id: 1, collection: "users", role: "admin", exp: now() + 60 };
    expect(verifyStaffToken(forged(HEADER, claims, "another-secret"), SECRET)).toBeUndefined();
    expect(verifyStaffToken(forged({ ...HEADER, alg: "none" }, claims), SECRET)).toBeUndefined();
    expect(verifyStaffToken(forged({ ...HEADER, authVersion: 2 }, claims), SECRET)).toBeUndefined();
    const { authVersion: _dropped, ...unversioned } = HEADER;
    expect(verifyStaffToken(forged(unversioned, claims), SECRET)).toBeUndefined();
    expect(verifyStaffToken(`${header}.${promoted}.`, SECRET)).toBeUndefined();
  });

  it("refuses no token, no secret and what is not a JWT", () => {
    const claims = { id: 1, collection: "users", role: "admin", exp: now() + 60 };
    expect(verifyStaffToken(forged(HEADER, claims), SECRET)).toBeDefined();
    expect(verifyStaffToken(undefined, SECRET)).toBeUndefined();
    expect(verifyStaffToken(forged(HEADER, claims), undefined)).toBeUndefined();
    expect(verifyStaffToken(forged(HEADER, claims), "")).toBeUndefined();
    for (const junk of ["", "a.b", "a.b.c.d", "%%.%%.%%", "e30.e30.e30"]) {
      expect(verifyStaffToken(junk, SECRET), junk).toBeUndefined();
    }
  });
});
