import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";
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

export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email", defaultColumns: ["email", "role", "updatedAt"] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { secure: process.env.NODE_ENV === "production", sameSite: "Lax" },
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
  hooks: { beforeChange: [firstUserIsAdmin] },
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
      saveToJWT: true,
    },
  ],
};
