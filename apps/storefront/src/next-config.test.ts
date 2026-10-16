import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../next.config";

afterEach(() => vi.unstubAllEnvs());

// D33: under Cache Components a build without the flag renders every DS path but one on request
// (`dynamicParams = false` is a build error there), so the gate must be a constant in the bundle,
// not a read of the runtime environment. `next.config.ts`'s `env` is what makes it one; without
// the entry, a server started with the flag would answer 200 for the unlisted paths.
describe("next.config.ts freezes the design-system flag into the build", () => {
  it("writes `true` for a build with the flag and `false` for one without", () => {
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    expect(config(PHASE_PRODUCTION_BUILD).env).toMatchObject({ DESIGN_SYSTEM_ENABLED: "true" });
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      vi.stubEnv("DESIGN_SYSTEM_ENABLED", value);
      expect(config(PHASE_PRODUCTION_BUILD).env, String(value)).toMatchObject({
        DESIGN_SYSTEM_ENABLED: "false",
      });
    }
  });

  it("always sets a string, so the read is never left to run time", () => {
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", undefined);
    expect(typeof config(PHASE_PRODUCTION_BUILD).env?.DESIGN_SYSTEM_ENABLED).toBe("string");
  });
});
