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

// `prompts`, `inquirer` and `readline` confirmations end with a hint like `(y/N)` or `[Y/n]`.
const YES_NO_PROMPT = /[([](?:y\/n|y\/N|Y\/n|yes\/no)[)\]]/;

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
  // there): refuse what cannot be quoted safely rather than guess.
  if (/[%\r\n]/.test(arg)) throw new Error(`Cannot pass ${JSON.stringify(arg)} to cmd.exe safely`);
  return `"${arg.replace(/"/g, '""')}"`;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function stopTree(pid: number | undefined, platform: NodeJS.Platform): void {
  if (pid === undefined) return;
  try {
    // A negative pid is the whole process group: `pnpm` starts `sh`, which starts `node`.
    if (platform === "win32")
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    else process.kill(-pid, "SIGTERM");
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
  const { file, args: fileArgs, shell } = invocation(command, args, platform);

  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    let prompt: string | undefined;
    let settled = false;
    const finish = (result: Omit<RunResult, "output" | "timedOut" | "prompt">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (child.pid !== undefined) running.delete(child.pid);
      resolve({ ...result, output, timedOut, ...(prompt === undefined ? {} : { prompt }) });
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
      stopTree(child.pid, platform);
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const collect = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
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
          stopTree(child.pid, platform);
        }
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => finish({ code: null, error: error.message }));
    child.on("close", (code) => finish({ code }));
  });
}
