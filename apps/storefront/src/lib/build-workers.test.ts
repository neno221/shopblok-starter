import { describe, expect, it } from "vitest";
import { BUILD_WORKERS_CAP, buildWorkers, isBuildPhase } from "./build-workers";

describe("the build's workers (W6 item 7)", () => {
  it("keeps Next's count (cpus - 1) up to the cap", () => {
    expect(buildWorkers(1, {})).toBe(1);
    expect(buildWorkers(2, {})).toBe(1);
    // CI's runners and the cloud VM: 4 threads, 3 workers, as before.
    expect(buildWorkers(4, {})).toBe(3);
    expect(buildWorkers(5, {})).toBe(BUILD_WORKERS_CAP);
    // The W6 laptop: 12 threads, 11 workers without the cap.
    expect(buildWorkers(12, {})).toBe(BUILD_WORKERS_CAP);
    expect(buildWorkers(64, { STOREFRONT_BUILD_WORKERS: " " })).toBe(BUILD_WORKERS_CAP);
  });

  it("takes STOREFRONT_BUILD_WORKERS over the cap, and refuses a bad one", () => {
    expect(buildWorkers(4, { STOREFRONT_BUILD_WORKERS: "8" })).toBe(8);
    expect(buildWorkers(12, { STOREFRONT_BUILD_WORKERS: " 2 " })).toBe(2);
    for (const bad of ["0", "-1", "2.5", "all"])
      expect(() => buildWorkers(4, { STOREFRONT_BUILD_WORKERS: bad })).toThrow(/whole number/);
  });

  it("knows the build's phase", () => {
    expect(isBuildPhase({ NEXT_PHASE: "phase-production-build" })).toBe(true);
    expect(isBuildPhase({ NEXT_PHASE: "phase-production-server" })).toBe(false);
    expect(isBuildPhase({})).toBe(false);
  });
});
