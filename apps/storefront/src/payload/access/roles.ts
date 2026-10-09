import type { Access, FieldAccess, PayloadRequest, Where } from "payload";

/**
 * The signed-in user when it is a staff member: a `users` document. An integration signed in with
 * an API key (`integrations`) is a user too in Payload, but it is not staff, and its `id` may
 * equal a staff member's, so every check looks at `collection` first.
 */
export function staffUser(req: PayloadRequest) {
  const user = req.user;
  return user?.collection === "users" ? user : null;
}

export function isAdminRequest(req: PayloadRequest): boolean {
  return staffUser(req)?.role === "admin";
}

export const isAdmin: Access = ({ req }) => isAdminRequest(req);

export const isStaff: Access = ({ req }) => staffUser(req) !== null;

/** For a field: only admins may change it (a user's `role`). */
export const isAdminField: FieldAccess = ({ req }) => isAdminRequest(req);

/**
 * Admins get every document; a signed-in user of the collection gets its own. `slug` is the
 * collection's, so a staff member with id 1 never matches an integration with id 1.
 */
export function adminOrSelf(slug: "users" | "integrations"): Access {
  return ({ req }): boolean | Where => {
    if (isAdminRequest(req)) return true;
    const user = req.user;
    return user?.collection === slug ? { id: { equals: user.id } } : false;
  };
}

/** Staff see drafts too; everyone else sees published documents only. */
export const staffOrPublished: Access = ({ req }) =>
  staffUser(req) !== null ? true : { _status: { equals: "published" } };
