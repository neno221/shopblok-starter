import Medusa from "@medusajs/js-sdk";

/**
 * The admin's own client for the backend's custom routes (Medusa's guide for admin
 * customizations), with the signed-in admin's session. Medusa serves the admin from the backend
 * itself (`/app`), so the backend is this origin.
 */
export const sdk = new Medusa({ baseUrl: "/", auth: { type: "session" } });
