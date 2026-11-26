import middlewares from "../middlewares";
import { securityHeaders } from "../security-headers";

// M7 D137 (T106): Medusa's headers. The e2e check on a running Medusa is
// `apps/storefront/e2e/headers.spec.ts` (`/store/products` without `X-Powered-By`).
describe("securityHeaders", () => {
  it("removes X-Powered-By, sets nosniff and passes the request on", () => {
    const headers = new Map<string, string>([["x-powered-by", "Express"]]);
    const res = {
      removeHeader: (name: string) => headers.delete(name.toLowerCase()),
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    };
    const next = jest.fn();
    securityHeaders({} as never, res as never, next);
    expect(headers.has("x-powered-by")).toBe(false);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(next).toHaveBeenCalledWith();
  });

  it("runs on every route, for every method, before the routes of ours", () => {
    const first = middlewares.routes?.[0];
    expect(first?.matcher).toBe("/*");
    expect(first?.method).toBeUndefined();
    expect(first?.middlewares).toEqual([securityHeaders]);
  });
});
