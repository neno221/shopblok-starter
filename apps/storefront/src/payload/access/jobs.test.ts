import type { PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";
import { cronOrAdmin } from "./jobs";

const access = cronOrAdmin(() => "cron-secret");
const as = (user: unknown, authorization?: string) =>
  access({
    req: {
      user,
      headers: new Headers(authorization === undefined ? {} : { authorization }),
    } as unknown as PayloadRequest,
  });

describe("cronOrAdmin (jobs.access.run and queue)", () => {
  it("lets the cron secret run jobs, with no user", () => {
    expect(as(null, "Bearer cron-secret")).toBe(true);
  });

  it("lets an admin run jobs", () => {
    expect(as({ collection: "users", id: 1, role: "admin" })).toBe(true);
  });

  it("refuses an editor, an integration's API key, an anonymous call and a wrong secret", () => {
    expect(as({ collection: "users", id: 2, role: "editor" })).toBe(false);
    expect(as({ collection: "integrations", id: 1, role: "medusa-sync" })).toBe(false);
    expect(as(null)).toBe(false);
    expect(as(null, "Bearer nope")).toBe(false);
    expect(as(null, "cron-secret")).toBe(false);
  });

  it("refuses everything but an admin when no secret is set", () => {
    const unset = cronOrAdmin(() => undefined);
    const req = (authorization: string, user: unknown = null) =>
      ({ user, headers: new Headers({ authorization }) }) as unknown as PayloadRequest;
    expect(unset({ req: req("Bearer ") })).toBe(false);
    expect(unset({ req: req("Bearer undefined") })).toBe(false);
    expect(unset({ req: req("", { collection: "users", id: 1, role: "admin" }) })).toBe(true);
  });
});
