import type { AccessArgs, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";
import { Pages } from "./pages";

const as = (user: unknown) => ({ req: { user } as PayloadRequest }) as AccessArgs;

describe("Pages access", () => {
  it("shows the version history (every draft) to staff only", () => {
    const readVersions = Pages.access?.readVersions;
    // Unset, Payload's `executeAccess` lets any signed-in user through, an API key included.
    expect(readVersions).toBeTypeOf("function");
    expect(readVersions?.(as({ collection: "users", id: 2, role: "editor" }))).toBe(true);
    expect(readVersions?.(as({ collection: "integrations", id: 1, role: "medusa-sync" }))).toBe(
      false,
    );
    expect(readVersions?.(as(null))).toBe(false);
  });
});
