import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeOperationHook,
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

/** The refusal's words in the admin, which is in English (Payload's own messages are). */
export const tooManyMessage = (retryAfter: number): string => {
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
};

/**
 * M7 D142 (T108): Payload's sign-in (10 per 15 minutes per address and e-mail) and its reset
 * request (3 an hour per e-mail), kept by Medusa's limiter through the signed route
 * (`lib/security/rate-limit.ts`). `beforeOperation` runs before Payload reads the user or checks the
 * password, so a refused attempt never reaches Payload's own lockout (`maxLoginAttempts`): one
 * address can neither keep guessing an admin's password nor lock the account. The Local API
 * (`payloadAPI: "local"`, the shop's own code, seeds and scripts) is not a visitor and is not
 * counted. Medusa down: the attempt goes on, and Payload's lockout still holds. The limiter's
 * module is imported when a sign-in comes, never with the config: it is `server-only`, which throws
 * in the Payload CLI's plain Node (D95, `config-outside-next.test.ts`).
 */
export const limitSignIn: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== "login" && operation !== "forgotPassword") return args;
  if (req.payloadAPI === "local") return args;
  const { consumeLimit, emailKey } = await import("../../lib/security/rate-limit");
  const data = (args as { data?: { email?: unknown } }).data;
  const email = typeof data?.email === "string" ? data.email : "";
  const limit =
    operation === "login"
      ? await consumeLimit("payload-login", emailKey(email), req.headers)
      : await consumeLimit("payload-reset", emailKey(email), req.headers);
  if (!limit.allowed) throw new APIError(tooManyMessage(limit.retryAfter), 429, {}, true);
  return args;
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
    beforeOperation: [limitSignIn],
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
