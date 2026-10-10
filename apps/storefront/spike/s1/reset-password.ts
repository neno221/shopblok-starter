import config from "@payload-config";
import { getPayload } from "payload";
const payload = await getPayload({ config });
const { docs } = await payload.find({ collection: "users", limit: 1, overrideAccess: true });
await payload.update({
  collection: "users",
  id: docs[0]!.id,
  data: { password: "Probe-Passw0rd!" },
  overrideAccess: true,
});
console.log("password reset for", docs[0]!.email);
process.exit(0);
