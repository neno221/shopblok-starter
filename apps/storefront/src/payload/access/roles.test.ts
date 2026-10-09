import type { AccessArgs, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";
import { adminOrSelf, isAdmin, isStaff, staffOrPublished, staffUser } from "./roles";

const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;
const admin = { collection: "users", id: 1, role: "admin" };
const editor = { collection: "users", id: 2, role: "editor" };
const sync = { collection: "integrations", id: 1, role: "medusa-sync" };

describe("staffUser", () => {
  it("is a user of the users collection, and nothing else", () => {
    expect(staffUser(as(admin).req)).toBe(admin);
    expect(staffUser(as(sync).req)).toBeNull();
    expect(staffUser(as(null).req)).toBeNull();
  });
});

describe("isAdmin / isStaff", () => {
  it("lets an admin do admin things", () => {
    expect(isAdmin(as(admin))).toBe(true);
    expect(isStaff(as(admin))).toBe(true);
  });

  it("lets an editor in, but not as an admin", () => {
    expect(isAdmin(as(editor))).toBe(false);
    expect(isStaff(as(editor))).toBe(true);
  });

  it("refuses an integration and a visitor, even an integration whose role says admin", () => {
    for (const user of [sync, { ...sync, role: "admin" }, null]) {
      expect(isAdmin(as(user))).toBe(false);
      expect(isStaff(as(user))).toBe(false);
    }
  });
});

describe("adminOrSelf", () => {
  it("gives an admin every document", () => {
    expect(adminOrSelf("users")(as(admin))).toBe(true);
    expect(adminOrSelf("integrations")(as(admin))).toBe(true);
  });

  it("gives anyone else their own document of that collection", () => {
    expect(adminOrSelf("users")(as(editor))).toEqual({ id: { equals: 2 } });
    expect(adminOrSelf("integrations")(as(sync))).toEqual({ id: { equals: 1 } });
  });

  it("does not match across collections: integration 1 is not user 1", () => {
    expect(adminOrSelf("users")(as(sync))).toBe(false);
    expect(adminOrSelf("integrations")(as(editor))).toBe(false);
  });

  it("gives a visitor nothing", () => {
    expect(adminOrSelf("users")(as(null))).toBe(false);
  });
});

describe("staffOrPublished", () => {
  it("shows staff everything and everyone else published documents only", () => {
    expect(staffOrPublished(as(editor))).toBe(true);
    const published = { _status: { equals: "published" } };
    expect(staffOrPublished(as(null))).toEqual(published);
    expect(staffOrPublished(as(sync))).toEqual(published);
  });
});
