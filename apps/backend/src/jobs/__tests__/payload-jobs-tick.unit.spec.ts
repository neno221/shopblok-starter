import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import payloadJobsTick, { config } from "../payload-jobs-tick";
import {
  createPayloadJobsTick,
  FAILURE_LOG_INTERVAL_MS,
  PAYLOAD_JOBS_PATH,
  tickSettings,
  TICK_TIMEOUT_MS,
} from "../../lib/payload-jobs";

// M7 D148 (1), T111: Medusa's worker calls Payload's jobs endpoint every minute with CRON_SECRET.
// A stand-in for Payload on localhost answers as Payload's `cronOrAdmin` does: 200 with the bearer,
// 401 without it. Removing the bearer from the tick (the plan's mutation) makes it answer 401,
// which the first test catches.

const SECRET = "cron-stand-in";

let server: Server;
let base = "";
let calls: { method: string; path: string; authorization: string | undefined }[] = [];
let hold = false;

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res) => {
    calls.push({
      method: req.method ?? "",
      path: req.url ?? "",
      authorization: req.headers.authorization,
    });
    if (hold) return; // never answers: the timeout's case
    const allowed =
      req.url === PAYLOAD_JOBS_PATH && req.headers.authorization === `Bearer ${SECRET}`;
    res.writeHead(allowed ? 200 : 401, { "content-type": "application/json" });
    res.end(
      JSON.stringify(
        allowed ? { message: "Success", noJobsRemaining: true } : { message: "Unauthorized" },
      ),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  calls = [];
  hold = false;
});

const logger = () => ({ info: jest.fn(), warn: jest.fn() });
const env = (overrides: Record<string, string | undefined> = {}) => ({
  PAYLOAD_SERVER_URL: `${base}/`,
  CRON_SECRET: ` ${SECRET} `,
  ...overrides,
});

describe("payload-jobs-tick (M7 D148, 1)", () => {
  it("runs every minute, and each run calls Payload's endpoint once, with the bearer", async () => {
    expect(config).toEqual({ name: "payload-jobs-tick", schedule: "* * * * *" });
    const log = logger();
    const tick = createPayloadJobsTick();
    await expect(tick(env(), log)).resolves.toBe("ok");
    await expect(tick(env(), log)).resolves.toBe("ok");
    expect(calls).toEqual([
      { method: "GET", path: PAYLOAD_JOBS_PATH, authorization: `Bearer ${SECRET}` },
      { method: "GET", path: PAYLOAD_JOBS_PATH, authorization: `Bearer ${SECRET}` },
    ]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("is off without CRON_SECRET or PAYLOAD_SERVER_URL, and says so once", async () => {
    expect(tickSettings({ PAYLOAD_SERVER_URL: base })).toBeUndefined();
    expect(tickSettings({ CRON_SECRET: SECRET, PAYLOAD_SERVER_URL: " " })).toBeUndefined();
    const log = logger();
    const tick = createPayloadJobsTick();
    await expect(tick(env({ CRON_SECRET: "" }), log)).resolves.toBe("off");
    await expect(tick(env({ PAYLOAD_SERVER_URL: undefined }), log)).resolves.toBe("off");
    expect(calls).toEqual([]);
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.info.mock.calls[0][0]).toMatch(/off/);
  });

  it("logs a refused secret once per ten minutes, never throws, and says when it answers again", async () => {
    let clock = 1_000_000;
    const log = logger();
    const tick = createPayloadJobsTick({ now: () => clock });
    const wrong = env({ CRON_SECRET: "not-the-storefronts" });
    for (let minute = 0; minute < 10; minute++) {
      await expect(tick(wrong, log)).resolves.toBe("failed");
      clock += 60_000;
    }
    expect(calls).toHaveLength(10);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toContain("HTTP 401");
    expect(log.warn.mock.calls[0][0]).not.toContain("not-the-storefronts");
    // Ten minutes after the first line, the next failure is logged again.
    expect(clock - 1_000_000).toBe(FAILURE_LOG_INTERVAL_MS);
    await tick(wrong, log);
    expect(log.warn).toHaveBeenCalledTimes(2);
    await expect(tick(env(), log)).resolves.toBe("ok");
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("answers again"));
  });

  it("gives up after its timeout (20 s) without an answer, and when nothing listens", async () => {
    expect(TICK_TIMEOUT_MS).toBe(20_000);
    hold = true;
    const log = logger();
    const tick = createPayloadJobsTick({ timeoutMs: 300 });
    await expect(tick(env(), log)).resolves.toBe("failed");
    expect(calls).toHaveLength(1);
    expect(log.warn.mock.calls[0][0]).toMatch(/TimeoutError/);
    await expect(tick(env({ PAYLOAD_SERVER_URL: "http://127.0.0.1:1" }), logger())).resolves.toBe(
      "failed",
    );
  });

  it("is the job Medusa runs: it reads the process's environment and Medusa's logger", async () => {
    process.env.PAYLOAD_SERVER_URL = base;
    process.env.CRON_SECRET = SECRET;
    const log = logger();
    try {
      await payloadJobsTick({ resolve: () => log } as never);
    } finally {
      delete process.env.PAYLOAD_SERVER_URL;
      delete process.env.CRON_SECRET;
    }
    expect(calls).toHaveLength(1);
    expect(calls[0]?.authorization).toBe(`Bearer ${SECRET}`);
  });
});
