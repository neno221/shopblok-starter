import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { R2FileProviderService } from "./service";

// A File Module provider (M6 D127): `modules.ts` registers it, as the File Module's only provider,
// when every S3_* key and S3_PRIVATE_BUCKET are set; without them Medusa keeps `file-local`.
export default ModuleProvider(Modules.FILE, {
  services: [R2FileProviderService],
});
