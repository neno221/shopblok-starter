import { afterEach, describe, expect, it, vi } from "vitest";
import { STATUS_CHECK_TIMEOUT_MS, statusResponse } from "./status";

const ok = async () => {};
const fails = async () => {
  throw new Error("connect ECONNREFUSED 127.0.0.1:9000");
};
const hangs = () => new Promise<void>(() => {});

describe("/next/status", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("answers 200 when both checks pass, and no cache keeps it", async () => {
    const response = await statusResponse({ medusa: ok, payload: ok });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      checks: { medusa: "ok", payload: "ok" },
    });
  });

  it("answers 503 when one is down, and the body names no internals", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await statusResponse({ medusa: fails, payload: ok });
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
      checks: { medusa: "down", payload: "ok" },
    });
    expect(body).not.toContain("ECONNREFUSED");
    expect(warn).toHaveBeenCalledWith("[status] medusa down:", expect.stringContaining("ECONN"));
  });

  it("gives a check that never answers 2 s, and runs the two side by side", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const pending = statusResponse({ medusa: hangs, payload: hangs });
    await vi.advanceTimersByTimeAsync(STATUS_CHECK_TIMEOUT_MS);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      checks: { medusa: "down", payload: "down" },
    });
  });
});
