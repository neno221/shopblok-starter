import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";
import { firstUserClosed, isProduction } from "../../lib/env";
import { adminOrSelf, isAdmin, isAdminField } from "../access/roles";

/** The very first user (create-first-user) becomes an admin, whatever the form said. */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create") return data;
  // A count, not on behalf of a user: there is none yet when the first account is made.
  const { totalDocs } = await req.payload.count({
    collection: "users",
    overrideAccess: true,
    req,
  });
  return totalDocs === 0 ? { ...data, role: "admin" } : data;
};

/** What a staging seed passes as `context` to make the first admin on a deployment (M7 D136). */
export const SEED_CONTEXT = "shopblok-seed";

/**
 * On a deployment (M7 D136, 6), nobody makes the first user through Payload's first-register
 * endpoint, which answers anyone while `users` is empty: only the staging seed does
 * (`src/scripts/seed-staging.ts`, with `context: { [SEED_CONTEXT]: true }`). The proxy already
 * answers both first-user paths with 403; this is the guard behind it, for any other way in.
 */
export const closedFirstUser: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create" || !firstUserClosed() || req.context[SEED_CONTEXT] === true)
    return data;
  const { totalDocs } = await req.payload.count({
    collection: "users",
    overrideAccess: true,
    req,
  });
  if (totalDocs === 0)
    throw new APIError(
      "The first user of a deployment is made by its seed, not by this form (DEPLOY.md).",
      403,
      {},
    );
  return data;
};

/**
 * Throws unless an admin other than `id` exists. Without an admin nobody can manage users or
 * markets, and an empty `users` table lets the next visitor to /admin/create-first-user become one.
 */
async function requireAnotherAdmin(req: PayloadRequest, id: number | string): Promise<void> {
  const { totalDocs } = await req.payload.count({
    collection: "users",
    where: { role: { equals: "admin" }, id: { not_equals: id } },
    overrideAccess: true,
    req,
  });
  if (totalDocs > 0) return;
  // Without `data`, a production build shows "An unknown error occurred.": `formatErrors` then
  // needs the error's class name, and minification empties it.
  throw new APIError("This is the last admin. Make another user an admin first.", 400, {});
}

/** The last admin cannot be demoted. */
export const keepOneAdmin: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "update" && originalDoc?.role === "admin" && data.role === "editor") {
    await requireAnotherAdmin(req, originalDoc.id);
  }
  return data;
};

/** Nor can the last admin be deleted. */
export const keepOneAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const user = await req.payload.findByID({
    collection: "users",
    id,
    depth: 0,
    overrideAccess: true,
    req,
  });
  if (user.role === "admin") await requireAnotherAdmin(req, id);
};

export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email", defaultColumns: ["email", "role", "updatedAt"] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { secure: isProduction(), sameSite: "Lax" },
  },
  access: {
    // Create-first-user does not go through `create`; every later account is made by an admin.
    create: isAdmin,
    read: adminOrSelf("users"),
    update: adminOrSelf("users"),
    delete: isAdmin,
    unlock: isAdmin,
    // The admin panel is for staff. An integration's API key is not a way in.
    admin: ({ req }) => req.user?.collection === "users",
  },
  hooks: {
    beforeChange: [closedFirstUser, firstUserIsAdmin, keepOneAdmin],
    beforeDelete: [keepOneAdminOnDelete],
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      // Only an admin may change roles, so an editor cannot promote themselves.
      access: { create: isAdminField, update: isAdminField },
      // The create-first-user form shows this field with "Editor" selected, and `firstUserIsAdmin`
      // overrides it. A condition that hid it there would make the column nullable (Payload skips
      // validation for a hidden field), and a function default would drop the database default.
      admin: {
        description:
          "Admins manage users, integrations and markets; editors manage content. The first account is always an admin, whatever is chosen here.",
      },
      saveToJWT: true,
    },
  ],
};
