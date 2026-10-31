import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http";

import { SaveMarketCountryBody, SaveMarketSettingsBody } from "./validators";

// `/admin/*` is authenticated by Medusa (an admin session, a bearer token or a secret API key) and
// `/store/*` needs the publishable key, so nothing here adds either.
export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/markets/countries/:code",
      middlewares: [validateAndTransformBody(SaveMarketCountryBody)],
    },
    {
      method: ["POST"],
      matcher: "/admin/markets/settings",
      middlewares: [validateAndTransformBody(SaveMarketSettingsBody)],
    },
  ],
});
