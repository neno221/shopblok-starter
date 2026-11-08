import type { ServerProps } from "payload";
import { readStoreBrand } from "./store-brand";
import "./brand.css";

/**
 * The admin's logo (`admin.components.graphics.Logo`, D108): the shop's, where Payload's own sits
 * on the login, first-user and password screens. The site settings' logo, named by the store's
 * name, or the store's name as text while there is no logo (as the shop's header does).
 */
export async function AdminLogo({ payload }: Pick<ServerProps, "payload">) {
  const { storeName, logo } = await readStoreBrand(payload);
  if (logo === null) return <span className="admin-logo admin-logo--name">{storeName}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded file of any size, drawn by height.
    <img
      className="admin-logo admin-logo--image"
      src={logo.src}
      alt={storeName}
      width={logo.width}
      height={logo.height}
    />
  );
}
