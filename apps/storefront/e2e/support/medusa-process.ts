import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Stops Medusa for the outage spec (M3 plan, D67 item 2; T42; the spec is T49's). It reads the PID
// file that `.github/actions/start-medusa` wrote (`$RUNNER_TEMP/servers/medusa.pid`, named by
// `E2E_MEDUSA_PID`) and gives the PID to `.github/scripts/stop-tree.sh --port 9000`. The PID is
// `pnpm`'s: `pnpm` > `medusa develop` > `medusa start`, so a signal to the one PID can leave
// :9000 serving; the script stops the whole tree, stops an orphan on the port by its own PID, and
// exits 0 only when the port is free. Then this waits until `/health` refuses.
//
// It never starts Medusa. The action is the only thing that does, so one process owns the port and
// the PID file names it: `ci.yml` runs the action again after the outage spec, and the recovery spec
// (O5) runs against that server.

/** Medusa's port, in CI and under `pnpm dev`. */
export const MEDUSA_PORT = 9000;

const stopTreeScript = path.resolve(
  import.meta.dirname,
  "../../../../.github/scripts/stop-tree.sh",
);

export type RunResult = { status: number | null; output: string };
/** Runs a command and waits for it. A seam for the tests. */
export type Run = (command: string, args: string[]) => RunResult;

const runCommand: Run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    status: result.error === undefined ? result.status : null,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`.trim(),
  };
};

/**
 * What the PID file holds, as it is. A file with no number in it is not repaired here:
 * `stop-tree.sh` answers 2 for it, so a failed start never looks like "nothing to stop".
 */
export function readPid(file: string): string {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `${file} cannot be read. E2E_MEDUSA_PID must name the PID file of .github/actions/start-medusa ($RUNNER_TEMP/servers/medusa.pid): Medusa was not started through the action.`,
    );
  }
  return text.trim();
}

/** Whether something answers HTTP at `url`, whatever it says. A refused connection is "down". */
export async function medusaIsUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch (error) {
    // A server that accepts and never answers still holds the port.
    return error instanceof Error && error.name === "TimeoutError";
  }
}

export type WaitOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  /** Seams for the tests. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/** Polls until `isUp` says no. Returns how long it waited (ms); throws when it is still up at the limit. */
export async function waitUntilDown(
  isUp: () => Promise<boolean>,
  {
    timeoutMs = 10_000,
    intervalMs = 250,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  }: WaitOptions = {},
): Promise<number> {
  const start = now();
  while (await isUp()) {
    const waited = now() - start;
    if (waited >= timeoutMs) {
      throw new Error(`Medusa still answers /health ${waited} ms after it was stopped.`);
    }
    await sleep(intervalMs);
  }
  return now() - start;
}

export type StopOptions = WaitOptions & {
  /** The PID file. Default: the file `E2E_MEDUSA_PID` names. */
  pidFile?: string;
  /** Default 9000. Another port only for a test against a throwaway listener. */
  port?: number;
  healthUrl?: string;
  run?: Run;
  isUp?: () => Promise<boolean>;
};

/**
 * Stops Medusa and waits until `/health` refuses. Throws, with the script's output, when
 * `stop-tree.sh` exits non-zero (a process left, or the port still accepting connections, or a
 * PID file with no number in it), and when `/health` still answers afterwards.
 */
export async function stopMedusa(
  options: StopOptions = {},
): Promise<{ output: string; waitedMs: number }> {
  const file = options.pidFile ?? process.env["E2E_MEDUSA_PID"];
  if (file === undefined || file === "") {
    throw new Error(
      "E2E_MEDUSA_PID is not set. It is the PID file of .github/actions/start-medusa ($RUNNER_TEMP/servers/medusa.pid).",
    );
  }
  const port = options.port ?? MEDUSA_PORT;
  const pid = readPid(file);
  const run = options.run ?? runCommand;
  const { status, output } = run("bash", [stopTreeScript, "--port", String(port), pid]);
  if (status !== 0) {
    throw new Error(`stop-tree.sh --port ${port} '${pid}' exited ${status}:\n${output}`);
  }
  const healthUrl = options.healthUrl ?? `http://localhost:${port}/health`;
  const waitedMs = await waitUntilDown(options.isUp ?? (() => medusaIsUp(healthUrl)), options);
  return { output, waitedMs };
}
