import type { ServerProps } from "payload";
import { SITE } from "../../lib/site";
import { readStoreBrand } from "./store-brand";
import "./brand.css";

/**
 * The admin's icon (`admin.components.graphics.Icon`, D108): the mark at the start of every
 * screen's breadcrumbs, the link to the dashboard. The site settings' icon, or the store name's
 * first letter in a square, as Medusa Admin draws a store without a picture. Payload names the
 * link "Dashboard" (a `title` around the icon), so the icon itself is decorative.
 *
 * Payload also draws the icon into its Open Graph picture (`/api/og`), with no `payload` and a
 * renderer that cannot wait: that gets the code's store name's letter at once.
 */
export function AdminIcon({ payload }: Partial<Pick<ServerProps, "payload">>) {
  if (payload === undefined) return <Letter name={SITE.storeName} />;
  return <StoreIcon payload={payload} />;
}

async function StoreIcon({ payload }: Pick<ServerProps, "payload">) {
  const { storeName, icon } = await readStoreBrand(payload);
  if (icon === null) return <Letter name={storeName} />;
  // eslint-disable-next-line @next/next/no-img-element -- an uploaded square of any size.
  return <img className="admin-icon admin-icon--image" src={icon.src} alt="" />;
}

function Letter({ name }: { name: string }) {
  const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "";
  return (
    <span className="admin-icon admin-icon--letter" aria-hidden="true">
      {letter}
    </span>
  );
}
