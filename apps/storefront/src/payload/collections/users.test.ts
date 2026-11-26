import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closedFirstUser,
  keepOneAdmin,
  keepOneAdminOnDelete,
  limitSignIn,
  SEED_CONTEXT,
  tooManyMessage,
} from "./users";

const consumeLimit = vi.fn();
vi.mock("../../lib/security/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/security/rate-limit")>()),
  consumeLimit: (...args: unknown[]) => consumeLimit(...args),
}));

/** A request whose `users` has `otherAdmins` admins besides the one acted on. */
function request(otherAdmins: number, existing: { role: string } = { role: "admin" }) {
  const count = vi.fn().mockResolvedValue({ totalDocs: otherAdmins });
  const findByID = vi.fn().mockResolvedValue(existing);
  return { req: { payload: { count, findByID } }, count };
}

const change = (
  args: { operation: "create" | "update"; originalDoc?: object; data: object },
  req: object,
) =>
  keepOneAdmin({
    ...args,
    req,
  } as unknown as Parameters<CollectionBeforeChangeHook>[0]) as Promise<object>;

const remove = (id: number, req: object) =>
  keepOneAdminOnDelete({
    id,
    req,
  } as unknown as Parameters<CollectionBeforeDeleteHook>[0]);

describe("keepOneAdmin", () => {
  const admin = { id: 1, role: "admin" };
  const demote = { operation: "update", originalDoc: admin, data: { role: "editor" } } as const;

  it("refuses to demote the last admin", async () => {
    const { req, count } = request(0);
    await expect(change(demote, req)).rejects.toThrow(/last admin/);
    // The count excludes the user being changed.
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { equals: "admin" }, id: { not_equals: 1 } },
        overrideAccess: true,
      }),
    );
  });

  it("lets an admin be demoted while another one remains", async () => {
    await expect(change(demote, request(1).req)).resolves.toEqual({
      role: "editor",
    });
  });

  it("does not look at anything but a demotion of an admin", async () => {
    const { req, count } = request(0);
    const data = { role: "editor" };
    await change({ operation: "update", originalDoc: { id: 2, role: "editor" }, data }, req);
    await change({ operation: "update", originalDoc: admin, data: {} }, req);
    await change({ operation: "update", originalDoc: admin, data: { role: "admin" } }, req);
    await change({ operation: "create", data }, req);
    expect(count).not.toHaveBeenCalled();
  });
});

describe("keepOneAdminOnDelete", () => {
  it("refuses to delete the last admin", async () => {
    await expect(remove(1, request(0).req)).rejects.toThrow(/last admin/);
  });

  it("lets an admin be deleted while another one remains", async () => {
    await expect(remove(1, request(1).req)).resolves.toBeUndefined();
  });

  it("lets an editor be deleted without counting admins", async () => {
    const { req, count } = request(0, { role: "editor" });
    await expect(remove(2, req)).resolves.toBeUndefined();
    expect(count).not.toHaveBeenCalled();
  });
});

describe("the session cookie", () => {
  afterEach(() => vi.unstubAllEnvs());

  // `Users` is built when the module loads, from the environment of that moment.
  async function cookieSecure() {
    vi.resetModules();
    const { Users } = await import("./users");
    const auth = Users.auth;
    return typeof auth === "object" ? auth.cookies?.secure : undefined;
  }

  it("is Secure in production and not elsewhere (an http://localhost admin needs it off)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await cookieSecure()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(await cookieSecure()).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(await cookieSecure()).toBe(false);
  });
});

describe("closedFirstUser (M7 D136, 6)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const create = (users: number, context: Record<string, unknown> = {}) => {
    const count = vi.fn().mockResolvedValue({ totalDocs: users });
    return closedFirstUser({
      operation: "create",
      data: { email: "a@example.com" },
      req: { payload: { count }, context },
    } as unknown as Parameters<CollectionBeforeChangeHook>[0]) as Promise<object>;
  };

  it.each([
    ["DEPLOY_ENV", "staging"],
    ["VERCEL_ENV", "preview"],
  ])("refuses the first user with %s=%s on an empty users table (403)", async (name, value) => {
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv(name, value);
    await expect(create(0)).rejects.toMatchObject({ status: 403 });
  });

  it("lets the staging seed make it, and an admin make the next ones", async () => {
    vi.stubEnv("DEPLOY_ENV", "staging");
    await expect(create(0, { [SEED_CONTEXT]: true })).resolves.toMatchObject({
      email: "a@example.com",
    });
    await expect(create(1)).resolves.toMatchObject({ email: "a@example.com" });
  });

  it("leaves development alone", async () => {
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    await expect(create(0)).resolves.toMatchObject({ email: "a@example.com" });
  });
});

// M7 D142 (T108): Payload's sign-in and reset, limited before Payload reads the user.
describe("limitSignIn", () => {
  const headers = new Headers({ "x-e2e-client-ip": "203.0.113.7" });
  const run = (operation: string, payloadAPI: string, email = "Admin@Example.com") =>
    limitSignIn({
      operation,
      args: { data: { email, password: "guess" } },
      req: { payloadAPI, headers },
    } as unknown as Parameters<typeof limitSignIn>[0]);

  it("counts a REST sign-in per address and e-mail, and a reset per e-mail", async () => {
    const { emailKey } = await import("../../lib/security/rate-limit");
    consumeLimit.mockReset().mockResolvedValue({ allowed: true });
    await run("login", "REST");
    await run("forgotPassword", "REST");
    expect(consumeLimit.mock.calls).toEqual([
      ["payload-login", emailKey("admin@example.com"), headers],
      ["payload-reset", emailKey("admin@example.com"), headers],
    ]);
  });

  it("refuses with a 429 and the minutes to wait, before the password is checked", async () => {
    consumeLimit.mockReset().mockResolvedValue({ allowed: false, retryAfter: 61 });
    await expect(run("login", "REST")).rejects.toMatchObject({
      status: 429,
      message: "Too many attempts. Try again in 2 minutes.",
    });
    expect(tooManyMessage(30)).toBe("Too many attempts. Try again in 1 minute.");
  });

  it("leaves the Local API and every other operation alone", async () => {
    consumeLimit.mockReset();
    await run("login", "local");
    await run("update", "REST");
    expect(consumeLimit).not.toHaveBeenCalled();
  });
});
