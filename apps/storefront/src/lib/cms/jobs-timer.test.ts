import { describe, expect, it, vi } from "vitest";
import { JOBS_INTERVAL_MS, startJobsTimer } from "./jobs-timer";

function setup(env: Record<string, string>, response: () => Promise<Response>) {
  const ticks: (() => void)[] = [];
  const fetch = vi.fn(response);
  const log = vi.fn();
  const started = startJobsTimer({
    env,
    fetch: fetch as unknown as typeof globalThis.fetch,
    setInterval: (run, ms) => {
      expect(ms).toBe(JOBS_INTERVAL_MS);
      ticks.push(run);
    },
    log,
  });
  return { started, ticks, fetch, log };
}

const ok = async () => new Response("{}", { status: 200 });

describe("startJobsTimer", () => {
  it("calls the jobs endpoint every minute in development, with the cron secret", async () => {
    const { started, ticks, fetch } = setup(
      { NODE_ENV: "development", CRON_SECRET: "c", NEXT_PUBLIC_BASE_URL: "http://localhost:8000" },
      ok,
    );
    expect(started).toBe(true);
    ticks[0]?.();
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://localhost:8000/api/payload-jobs/run");
    expect(init.headers).toEqual({ Authorization: "Bearer c" });
  });

  it("never starts in production, or without a secret", () => {
    expect(setup({ NODE_ENV: "production", CRON_SECRET: "c" }, ok).started).toBe(false);
    expect(setup({ NODE_ENV: "test", CRON_SECRET: "c" }, ok).started).toBe(false);
    expect(setup({ NODE_ENV: "development" }, ok).started).toBe(false);
  });

  it("logs a failing endpoint once, not every minute", async () => {
    const { ticks, log } = setup(
      { NODE_ENV: "development", CRON_SECRET: "c" },
      async () => new Response("", { status: 401 }),
    );
    ticks[0]?.();
    ticks[0]?.();
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    await new Promise((done) => setTimeout(done, 10));
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain("HTTP 401");
  });
});
