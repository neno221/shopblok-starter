/**
 * Links into Medusa Admin for the e-mails to its users (D122): an invite and a password reset. The
 * admin is served by the backend at `/app` (Medusa's default `admin.path`), so the link is
 * `MEDUSA_BACKEND_URL` + `/app` + the dashboard's page (`/invite`, `/reset-password`) with the
 * token as `?token=`, the two query parameters those pages read. `undefined` when
 * `MEDUSA_BACKEND_URL` is not an http(s) URL: no e-mail goes out with a link that leads nowhere.
 */
export function adminLink(
  backendUrl: string | undefined,
  page: "/invite" | "/reset-password",
  token: string,
): string | undefined {
  let base: URL;
  try {
    base = new URL(backendUrl ?? "");
  } catch {
    return undefined;
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") return undefined;
  const url = new URL(`${base.pathname.replace(/\/+$/, "")}/app${page}`, base.origin);
  url.searchParams.set("token", token);
  return url.toString();
}
