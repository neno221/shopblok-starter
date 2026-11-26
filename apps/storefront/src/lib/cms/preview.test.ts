import { beforeEach, describe, expect, it, vi } from "vitest";
import { seeded, withDomains } from "../markets/test-maps";
import { secretMatches } from "../secret";
import { exitPreviewResponse, previewResponse, type PreviewDeps } from "./preview";

const enable = vi.fn();
const disable = vi.fn();
const staffSignedIn = vi.fn(async (_headers: Headers) => true);

const deps: PreviewDeps = {
  secret: "s3cret",
  staffSignedIn,
  marketMap: async () => seeded,
  draftMode: async () => ({ enable, disable }),
};

const preview = (query: string, d: PreviewDeps = deps) =>
  previewResponse(new Request(`https://shop.example/next/preview?${query}`), d);

beforeEach(() => {
  enable.mockReset();
  disable.mockReset();
  staffSignedIn.mockReset();
  staffSignedIn.mockResolvedValue(true);
});

describe("secretMatches", () => {
  it("matches the secret only, and nothing when no secret is set", () => {
    expect(secretMatches("s3cret", "s3cret")).toBe(true);
    expect(secretMatches("s3cre", "s3cret")).toBe(false);
    expect(secretMatches("s3cret!", "s3cret")).toBe(false);
    expect(secretMatches(null, "s3cret")).toBe(false);
    expect(secretMatches("", "")).toBe(false);
    expect(secretMatches("x", undefined)).toBe(false);
  });
});

describe("GET /next/preview", () => {
  it("turns Draft Mode on and answers 307 to the page, for staff with the secret", async () => {
    const response = await preview("secret=s3cret&path=/us/about");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/us/about");
    expect(enable).toHaveBeenCalledOnce();
  });

  it("sends staff to an own-domain market's page at its key on this host (M7 D148, 3)", async () => {
    const domains = { ...deps, marketMap: async () => withDomains };
    for (const path of ["/de-ch/about", "/fr-ch", "/el-cy/store?page=2"]) {
      const response = await preview(`secret=s3cret&path=${encodeURIComponent(path)}`, domains);
      expect(response.status, path).toBe(307);
      expect(response.headers.get("location"), path).toBe(path);
    }
    // A market on this host is never at its key, and the key of a market with no domain is no page.
    for (const path of ["/de-de/about", "/el-cy/about", "//de-ch", "/de-ch/%2F%2Fx"]) {
      const map = path === "/el-cy/about" ? deps : domains;
      expect((await preview(`secret=s3cret&path=${encodeURIComponent(path)}`, map)).status, path).toBe(
        400,
      );
    }
  });

  it("leaves an own-domain market's preview for its published page on its domain (M7 D148, 3)", async () => {
    const domains = { ...deps, marketMap: async () => withDomains };
    const response = await exitPreviewResponse(
      new Request("https://shop.example/next/exit-preview?path=%2Fde-ch%2Fabout%3Fx%3D1", {
        method: "POST",
      }),
      domains,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://shop.ch/about?x=1");
    expect(disable).toHaveBeenCalledOnce();
  });

  it("answers 401 to a wrong or missing secret, before asking Payload", async () => {
    for (const query of ["secret=nope&path=/", "path=/"]) {
      expect((await preview(query)).status).toBe(401);
    }
    expect(staffSignedIn).not.toHaveBeenCalled();
    expect(enable).not.toHaveBeenCalled();
  });

  it("answers 401 without a staff session: the secret alone shows nothing", async () => {
    staffSignedIn.mockResolvedValue(false);
    expect((await preview("secret=s3cret&path=/")).status).toBe(401);
    expect(enable).not.toHaveBeenCalled();
  });

  it("hands Payload the request's headers (its cookie)", async () => {
    const request = new Request("https://shop.example/next/preview?secret=s3cret&path=/", {
      headers: { cookie: "payload-token=abc" },
    });
    await previewResponse(request, deps);
    expect(staffSignedIn.mock.calls[0]?.[0].get("cookie")).toBe("payload-token=abc");
  });

  it("answers 400 to a path that is not the shop's, and leaves Draft Mode off", async () => {
    for (const path of ["//evil.example", "https://evil.example", "/admin", "%2F%2Fevil.example"]) {
      const response = await preview(`secret=s3cret&path=${encodeURIComponent(path)}`);
      expect(response.status, path).toBe(400);
    }
    expect(enable).not.toHaveBeenCalled();
  });

  it("is not cached anywhere", async () => {
    expect((await preview("secret=s3cret&path=/")).headers.get("cache-control")).toBe("no-store");
  });
});

describe("POST /next/exit-preview", () => {
  const exit = (body: string) =>
    exitPreviewResponse(
      new Request("https://shop.example/next/exit-preview", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }),
      deps,
    );

  it("turns Draft Mode off and answers 303 to the page", async () => {
    const response = await exit("path=%2Fus%2Fabout");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/us/about");
    expect(disable).toHaveBeenCalledOnce();
  });

  it("sends anything safeRedirect refuses to the home page, never off-site", async () => {
    for (const body of ["path=%2F%2Fevil.example", "path=https%3A%2F%2Fevil.example", ""]) {
      const response = await exit(body);
      expect(response.headers.get("location"), body).toBe("/");
    }
  });

  it("takes the path from the query string as well", async () => {
    const response = await exitPreviewResponse(
      new Request("https://shop.example/next/exit-preview?path=/ch/fr", { method: "POST" }),
      deps,
    );
    expect(response.headers.get("location")).toBe("/ch/fr");
  });
});
