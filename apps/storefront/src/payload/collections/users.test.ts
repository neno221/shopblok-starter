import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from "payload";
import { describe, expect, it, vi } from "vitest";
import { keepOneAdmin, keepOneAdminOnDelete } from "./users";

/** A request whose `users` has `otherAdmins` admins besides the one acted on. */
function request(otherAdmins: number, existing: { role: string } = { role: "admin" }) {
  const count = vi.fn().mockResolvedValue({ totalDocs: otherAdmins });
  const findByID = vi.fn().mockResolvedValue(existing);
  return { req: { payload: { count, findByID } }, count, findByID };
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
  const demote = {
    operation: "update",
    originalDoc: { id: 1, role: "admin" },
    data: { role: "editor" },
  } as const;

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
    await change({ operation: "update", originalDoc: { id: 1, role: "admin" }, data: {} }, req);
    await change(
      {
        operation: "update",
        originalDoc: { id: 1, role: "admin" },
        data: { role: "admin" },
      },
      req,
    );
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
