import Medusa from "@medusajs/js-sdk";

/**
 * The panels' client for the plugin's own routes (`/admin/markets…`), with the signed-in admin's
 * session, like the backend's `src/admin/lib/sdk.ts`. `__BACKEND_URL__` is the global Medusa's
 * admin bundler defines from `admin.backendUrl` (the JS SDK docs' setup for a plugin's admin); with
 * none set, the admin is served by the backend itself (`/app`) and the backend is this origin.
 */
export const sdk = new Medusa({
  baseUrl: __BACKEND_URL__ || "/",
  auth: { type: "session" },
});
