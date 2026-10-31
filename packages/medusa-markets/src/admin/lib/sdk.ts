import Medusa from "@medusajs/js-sdk";

/**
 * The panels' client for the plugin's own routes (`/admin/markets…`), with the signed-in admin's
 * session, like the backend's `src/admin/lib/sdk.ts`. Medusa serves the admin from the backend
 * itself (`/app`), so the backend is this origin.
 */
export const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } });
