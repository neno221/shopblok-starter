import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as medusaProcess from "./medusa-process";
import { MEDUSA_PORT, readPid, stopMedusa, waitUntilDown } from "./medusa-process";

// A clock the fake sleep moves, so the loop's limits are tested without waiting.
function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("waitUntilDown", () => {
  it("returns at once, without sleeping, when /health already refuses", async () => {
    const clock = fakeClock();
    const sleep = vi.fn(clock.sleep);
    const isUp = vi.fn(async () => false);
    expect(await waitUntilDown(isUp, { sleep, now: clock.now })).toBe(0);
    expect(isUp).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("polls every interval until /health refuses, and says how long that took", async () => {
    const clock = fakeClock();
    let answers = 3;
    const waited = await waitUntilDown(async () => answers-- > 0, {
      intervalMs: 250,
      sleep: clock.sleep,
      now: clock.now,
    });
    expect(waited).toBe(750);
  });

  it("throws, saying how long it waited, when /health still answers at the limit", async () => {
    const clock = fakeClock();
    const isUp = vi.fn(async () => true);
    await expect(
      waitUntilDown(isUp, { timeoutMs: 1000, intervalMs: 250, sleep: clock.sleep, now: clock.now }),
    ).rejects.toThrow("Medusa still answers /health 1000 ms after it was stopped.");
    // 0, 250, 500, 750 and 1000 ms: it looks once more at the limit.
    expect(isUp).toHaveBeenCalledTimes(5);
  });
});

describe("stopMedusa", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "medusa-process-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const pidFile = (content: string) => {
    const file = path.join(dir, "medusa.pid");
    writeFileSync(file, content);
    return file;
  };
  const clock = fakeClock();
  const down = async () => false;

  it("gives the PID and port 9000 to stop-tree.sh, then waits for /health to refuse", async () => {
    const run = vi.fn(() => ({ status: 0, output: "stop-tree: stopped, port 9000 is free." }));
    const result = await stopMedusa({
      pidFile: pidFile("4242\n"),
      run,
      isUp: down,
      sleep: clock.sleep,
      now: clock.now,
    });
    expect(run).toHaveBeenCalledOnce();
    const [command, args] = run.mock.calls[0] as unknown as [string, string[]];
    expect(command).toBe("bash");
    expect(path.relative(process.cwd(), args[0]!).replaceAll("\\", "/")).toMatch(
      /(^|\/)\.github\/scripts\/stop-tree\.sh$/,
    );
    expect(args.slice(1)).toEqual(["--port", "9000", "4242"]);
    expect(MEDUSA_PORT).toBe(9000);
    expect(result).toEqual({ output: "stop-tree: stopped, port 9000 is free.", waitedMs: 0 });
  });

  it("reads the PID file named by E2E_MEDUSA_PID when none is given", async () => {
    vi.stubEnv("E2E_MEDUSA_PID", pidFile("77"));
    try {
      const run = vi.fn(() => ({ status: 0, output: "" }));
      await stopMedusa({ run, isUp: down, sleep: clock.sleep, now: clock.now });
      expect((run.mock.calls[0] as unknown as [string, string[]])[1].at(-1)).toBe("77");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses another port only when it is told to (a test against a throwaway listener)", async () => {
    const run = vi.fn(() => ({ status: 0, output: "" }));
    await stopMedusa({
      pidFile: pidFile("1"),
      port: 19000,
      run,
      isUp: down,
      sleep: clock.sleep,
      now: clock.now,
    });
    expect((run.mock.calls[0] as unknown as [string, string[]])[1].slice(1, 3)).toEqual([
      "--port",
      "19000",
    ]);
  });

  it("throws with the script's output when stop-tree.sh fails, and does not wait for /health", async () => {
    const isUp = vi.fn(down);
    const run = () => ({
      status: 1,
      output: "::error::stop-tree: port 9000 still accepts connections (owners: 811 )",
    });
    await expect(stopMedusa({ pidFile: pidFile("4242"), run, isUp })).rejects.toThrow(
      /exited 1:\n::error::stop-tree: port 9000 still accepts connections/,
    );
    expect(isUp).not.toHaveBeenCalled();
  });

  it("hands an empty PID file to stop-tree.sh, which answers 2: a failed start is not 'nothing to stop'", async () => {
    const run = vi.fn(() => ({ status: 2, output: "stop-tree: '' is not a PID." }));
    await expect(stopMedusa({ pidFile: pidFile(""), run, isUp: down })).rejects.toThrow(
      "stop-tree.sh --port 9000 '' exited 2:\nstop-tree: '' is not a PID.",
    );
    expect((run.mock.calls[0] as unknown as [string, string[]])[1].at(-1)).toBe("");
  });

  it("throws when /health still answers after the script succeeded", async () => {
    const run = () => ({ status: 0, output: "" });
    await expect(
      stopMedusa({
        pidFile: pidFile("5"),
        run,
        isUp: async () => true,
        timeoutMs: 500,
        sleep: clock.sleep,
        now: clock.now,
      }),
    ).rejects.toThrow(/Medusa still answers \/health/);
  });

  it("names E2E_MEDUSA_PID when it is not set, and the file when it cannot be read", async () => {
    vi.stubEnv("E2E_MEDUSA_PID", "");
    try {
      await expect(stopMedusa({ run: () => ({ status: 0, output: "" }) })).rejects.toThrow(
        /^E2E_MEDUSA_PID is not set/,
      );
    } finally {
      vi.unstubAllEnvs();
    }
    const missing = path.join(dir, "nowhere.pid");
    await expect(stopMedusa({ pidFile: missing })).rejects.toThrow(
      `${missing} cannot be read. E2E_MEDUSA_PID must name the PID file`,
    );
    expect(() => readPid(missing)).toThrow(/not started through the action/);
  });
});

describe("the module", () => {
  it("never starts Medusa: only the action does, so one process owns the port", () => {
    expect(Object.keys(medusaProcess).filter((name) => /start|spawn|launch/i.test(name))).toEqual(
      [],
    );
  });
});
