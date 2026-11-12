import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { ResendNotificationProviderService } from "./service";

// A Notification Module provider (M6 D121): `modules.ts` registers it for the `email` channel when
// RESEND_API_KEY and RESEND_FROM_EMAIL are set; without them the local provider keeps `email`.
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationProviderService],
});
