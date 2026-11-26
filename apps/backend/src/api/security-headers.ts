import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// M7 D137 (T106): Medusa's own headers, on every route it answers. Express names itself in
// `X-Powered-By` unless told not to; Medusa 2.23's loader already turns that off
// (`app.disable("x-powered-by")`), and this removes it again in case a release or another
// middleware puts it back. `nosniff` keeps a browser from reading a JSON answer as a script.
// Medusa answers the storefront's server and the admin, never a page of the shop, so it carries
// no CSP of its own (D138: "the browser never calls Medusa").
export function securityHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}
