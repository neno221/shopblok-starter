// Running commands for `pnpm bootstrap` (T13): one place that knows how to start `pnpm` on Linux,
// macOS and Windows, collects a command's output, never waits for input and never hangs for ever.
import { spawn } from "node:child_process";
import { stripAnsi } from "./output.ts";

export type RunOptions = {
  cwd?: string;
  /** Added to the environment of the command; an `undefined` value removes the variable. */
  env?: Readonly<Record<string, string | undefined>>;
  /** Kill the command (and what it started) after this long. Default: 10 minutes. */
  timeoutMs?: number;
  /** Copy the command's output to this process's stdout as it arrives. */
  stream?: boolean;
  /**
   * Stop the command when its output asks a yes/no question. Default: true. stdin is closed, so a
   * command that waits for the answer would wait for ever; this ends it at once instead.
   */
  abortOnPrompt?: boolean;
  /**
   * How long a command that was asked to stop (SIGTERM) may take to do so before it is killed
   * (SIGKILL). Default: 5 seconds. Without it, a command that traps SIGTERM and carries on would
   * keep `run` waiting for ever.
   */
  killAfterMs?: number;
};

export type RunResult = {
  /** The exit code, or `null` when the command could not start or was stopped by a signal. */
  code: number | null;
  /** stdout and stderr in the order they arrived: Medusa logs to both. */
  output: string;
  timedOut: boolean;
  /** The question, when the command was stopped because it asked one. */
  prompt?: string;
  /** Why the command could not start (for example `spawn docker ENOENT`). */
  error?: string;
};

// `prompts`, `inquirer` and `readline` confirmations end with a hint like `(y/N)`, `[Y/n]` or
// `(Yes/No)`: any case, so `(Y/N)` is a question too.
const YES_NO_PROMPT = /[([](?:y\/n|yes\/no)[)\]]/i;

export type Invocation = { file: string; args: string[]; shell: boolean };

// Commands that are `.cmd` shims on Windows. Node refuses to start those without a shell
// (CVE-2024-27980), and `shell: true` with an argument array is deprecated in Node 24, so on Windows
// the whole command line is built as one string instead.
const WINDOWS_SHIMS = new Set(["pnpm", "npm", "npx", "yarn"]);

/**
 * How to start `command` with `args` on `platform`. On Windows a shim runs through the shell with
 * every argument quoted for cmd.exe; everything else starts directly.
 */
export function invocation(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): Invocation {
  if (platform === "win32" && WINDOWS_SHIMS.has(command)) {
    return { file: [command, ...args.map(quoteForCmd)].join(" "), args: [], shell: true };
  }
  return { file: command, args: [...args], shell: false };
}

/** An argument as cmd.exe passes it on: bare when it is made of safe characters, else in quotes. */
export function quoteForCmd(arg: string): string {
  if (arg !== "" && /^[A-Za-z0-9_@+=:,./\\-]+$/.test(arg)) return arg;
  // Inside quotes `"` is doubled, and `%` would still expand (cmd's escape `^%` does not work
  // there): refuse what cannot be quoted safely rather than guess. The message does not repeat the
  // argument: it may be a password.
  if (/[%\r\n]/.test(arg)) {
    throw new Error("An argument contains % or a line break, which cmd.exe cannot be given safely");
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_KILL_AFTER_MS = 5_000;

function stopTree(
  pid: number | undefined,
  platform: NodeJS.Platform,
  signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
): void {
  if (pid === undefined) return;
  try {
    // A negative pid is the whole process group: `pnpm` starts `sh`, which starts `node`.
    if (platform === "win32") {
      // `/f` is already forceful; an 'error' event nobody listens to would end this process.
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" }).on(
        "error",
        () => {},
      );
    } else process.kill(-pid, signal);
  } catch {
    // Already gone.
  }
}

// Commands run in their own process group (so a timeout can stop the whole tree), which means a
// Ctrl-C in the terminal no longer reaches them: stop them ourselves when bootstrap is interrupted.
const running = new Set<number>();
let handlersInstalled = false;

function installInterruptHandlers(platform: NodeJS.Platform): void {
  if (handlersInstalled) return;
  handlersInstalled = true;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      for (const pid of running) stopTree(pid, platform);
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }
}

/** Runs a command to its end. Never rejects: a command that cannot start is a result with `error`. */
export function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> {
  const platform = process.platform;
  let invoked: Invocation;
  try {
    invoked = invocation(command, args, platform);
  } catch (error) {
    // An argument cmd.exe cannot be given safely: a result, like any other command that can't start.
    const reason = error instanceof Error ? error.message : String(error);
    return Promise.resolve({ code: null, output: "", timedOut: false, error: reason });
  }
  const { file, args: fileArgs, shell } = invoked;

  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    let prompt: string | undefined;
    let stopped = false;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;
    const finish = (result: Omit<RunResult, "output" | "timedOut" | "prompt">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (child.pid !== undefined) running.delete(child.pid);
      // A command that was stopped did not succeed, even if it exited 0 on the way out.
      const code = stopped && result.code === 0 ? null : result.code;
      resolve({ ...result, code, output, timedOut, ...(prompt === undefined ? {} : { prompt }) });
    };
    // SIGTERM first; a command that traps it and carries on is killed after a grace period, or
    // `close` would never come and this promise would never settle.
    const stop = () => {
      stopped = true;
      stopTree(child.pid, platform);
      killTimer ??= setTimeout(
        () => stopTree(child.pid, platform, "SIGKILL"),
        options.killAfterMs ?? DEFAULT_KILL_AFTER_MS,
      );
    };

    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const [key, value] of Object.entries(options.env ?? {})) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }

    const child = spawn(file, fileArgs, {
      cwd: options.cwd,
      env,
      shell,
      // stdin is closed, so nothing the command runs can wait for an answer (a prompt sees no TTY).
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: platform !== "win32",
    });
    if (child.pid !== undefined) running.add(child.pid);
    installInterruptHandlers(platform);
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    // Strings, decoded per stream: a multi-byte character (Medusa's `●`) can arrive in two chunks.
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    const collect = (text: string) => {
      output += text;
      if (options.stream) process.stdout.write(text);
      if (prompt === undefined && options.abortOnPrompt !== false) {
        // The question may arrive in two chunks, so look at the end of everything so far.
        const recent = output.slice(-400);
        if (YES_NO_PROMPT.test(recent)) {
          prompt =
            stripAnsi(recent)
              .split(/\r?\n/)
              .filter((line) => YES_NO_PROMPT.test(line))
              .at(-1)
              ?.trim() ?? "a yes/no question";
          stop();
        }
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => finish({ code: null, error: error.message }));
    child.on("close", (code) => finish({ code }));
  });
}
