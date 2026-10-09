import type { CollectionConfig } from "payload";
import { adminOrSelf, isAdmin } from "../access/roles";

/**
 * Machine users: other systems that call Payload with an API key, no password (M4's Medusa sync
 * is the first). An admin creates one and generates its key in the admin panel. The request then
 * carries `Authorization: integrations API-Key <key>`.
 */
export const Integrations: CollectionConfig = {
  slug: "integrations",
  admin: { useAsTitle: "name", defaultColumns: ["name", "role", "updatedAt"] },
  auth: { useAPIKey: true, disableLocalStrategy: true },
  access: {
    create: isAdmin,
    // An integration may read itself (`/api/integrations/me`); admins read all.
    read: adminOrSelf("integrations"),
    update: isAdmin,
    delete: isAdmin,
    // Never a way into the admin panel.
    admin: () => false,
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "medusa-sync",
      options: [{ label: "Medusa sync", value: "medusa-sync" }],
      saveToJWT: true,
    },
  ],
};
