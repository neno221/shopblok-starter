import { describe, expect, it } from "vitest";
import { GET, HEAD } from "./route";

// D54 (T28): what `next.config.ts`'s root-file rewrite answers. `markets.spec.ts` checks the same
// on `next start`, where the answer is the prerendered one.
describe("/next/missing-file", () => {
  it("answers GET with a plain-text 404 that no cache keeps", async () => {
    const response = GET();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(await response.text()).toBe("Not Found");
  });

  it("answers HEAD with the same status and headers, and no body", () => {
    const response = HEAD();
    expect(response.status).toBe(404);
    expect(Object.fromEntries(response.headers)).toEqual(Object.fromEntries(GET().headers));
    expect(response.body).toBeNull();
  });
});
