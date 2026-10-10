import { describe, expect, it } from "vitest";
import { invocation, quoteForCmd, run } from "./exec.ts";

describe("invocation", () => {
  it("starts a program directly on Linux and macOS", () => {
    expect(invocation("pnpm", ["--filter", "@shopblok/backend", "exec"], "linux")).toEqual({
      file: "pnpm",
      args: ["--filter", "@shopblok/backend", "exec"],
      shell: false,
    });
  });

  it("runs pnpm as one command line through the shell on Windows", () => {
    expect(
      invocation(
        "pnpm",
        ["--filter", "@shopblok/backend", "exec", "medusa", "db:migrate"],
        "win32",
      ),
    ).toEqual({
      file: "pnpm --filter @shopblok/backend exec medusa db:migrate",
      args: [],
      shell: true,
    });
  });

  it("starts other programs directly on Windows too", () => {
    expect(invocation("docker", ["compose", "port", "postgres", "5432"], "win32")).toEqual({
      file: "docker",
      args: ["compose", "port", "postgres", "5432"],
      shell: false,
    });
  });
});

describe("quoteForCmd", () => {
  it("leaves safe arguments bare and quotes the rest", () => {
    expect(quoteForCmd("db:migrate")).toBe("db:migrate");
    expect(quoteForCmd("./src/scripts/seed-markets.ts")).toBe("./src/scripts/seed-markets.ts");
    expect(quoteForCmd("admin@example.com")).toBe("admin@example.com");
    expect(quoteForCmd("has space")).toBe('"has space"');
    expect(quoteForCmd("")).toBe('""');
    expect(quoteForCmd('say "hi"')).toBe('"say ""hi"""');
    expect(quoteForCmd("a&b")).toBe('"a&b"');
  });

  it("refuses an argument cmd.exe would expand", () => {
    expect(() => quoteForCmd("%PATH%")).toThrow(/safely/);
    expect(() => quoteForCmd("a\nb")).toThrow(/safely/);
  });

  it("does not repeat the refused argument: it may be a password", () => {
    expect(() => quoteForCmd("hunter2%")).toThrow(/^(?!.*hunter2)/);
  });
});

describe("run", () => {
  const node = process.execPath;

  it("collects stdout and stderr together and reports the exit code", async () => {
    const result = await run(node, [
      "-e",
      'console.log("out"); console.error("err"); process.exit(3)',
    ]);
    expect(result.code).toBe(3);
    expect(result.output).toContain("out");
    expect(result.output).toContain("err");
    expect(result.timedOut).toBe(false);
  });

  it("closes stdin, so a program that waits for input ends instead of hanging", async () => {
    const result = await run(node, [
      "-e",
      'process.stdin.on("data", () => {}); process.stdin.on("end", () => { console.log("stdin ended"); });',
    ]);
    expect(result.code).toBe(0);
    expect(result.output).toContain("stdin ended");
  });

  it("adds and removes environment variables for the command only", async () => {
    process.env.BOOTSTRAP_TEST_REMOVED = "still here";
    const result = await run(
      node,
      ["-e", "console.log(process.env.A_ADDED, process.env.BOOTSTRAP_TEST_REMOVED)"],
      {
        env: { A_ADDED: "yes", BOOTSTRAP_TEST_REMOVED: undefined },
      },
    );
    expect(result.output.trim()).toBe("yes undefined");
    expect(process.env.BOOTSTRAP_TEST_REMOVED).toBe("still here");
    delete process.env.BOOTSTRAP_TEST_REMOVED;
  });

  it("runs in the given directory", async () => {
    const result = await run(node, ["-e", "console.log(process.cwd())"], { cwd: "/" });
    expect(result.output.trim()).toBe(
      process.platform === "win32" ? process.cwd().slice(0, 3) : "/",
    );
  });

  it("stops a command that runs too long", async () => {
    const result = await run(node, ["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 300 });
    expect(result.timedOut).toBe(true);
    expect(result.code).not.toBe(0);
  });

  it("stops a command that asks a yes/no question instead of waiting for an answer that cannot come", async () => {
    const started = Date.now();
    const result = await run(node, [
      "-e",
      'console.log("It looks like you have dev data. Would you like to proceed? \\u203a (y/N)"); setInterval(() => {}, 1000)',
    ]);
    expect(result.prompt).toContain("Would you like to proceed?");
    expect(result.prompt).toContain("(y/N)");
    expect(result.timedOut).toBe(false);
    expect(result.code).not.toBe(0);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("finds a question that arrives in two pieces, and one with colour codes", async () => {
    const result = await run(node, [
      "-e",
      'process.stdout.write("\\u001b[36m?\\u001b[39m Proceed (y"); setTimeout(() => process.stdout.write("/N)\\n"), 100); setInterval(() => {}, 1000)',
    ]);
    expect(result.prompt).toBe("? Proceed (y/N)");
  });

  it("finds a question whatever the case of its hint", async () => {
    for (const hint of ["(Y/N)", "(Yes/No)", "[y/n]", "[YES/NO]"]) {
      const result = await run(node, [
        "-e",
        `console.log("Proceed? ${hint}"); setInterval(() => {}, 1000)`,
      ]);
      expect(result.prompt, hint).toContain(hint);
      expect(result.code, hint).not.toBe(0);
    }
  });

  it("kills a command that ignores SIGTERM instead of waiting for it for ever", async () => {
    const started = Date.now();
    const result = await run(
      node,
      ["-e", 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'],
      { timeoutMs: 200, killAfterMs: 300 },
    );
    expect(result.timedOut).toBe(true);
    expect(result.code).not.toBe(0);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("does not call a stopped command a success when it exits 0 as it stops", async () => {
    const timedOut = await run(
      node,
      ["-e", 'process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 1000)'],
      { timeoutMs: 300 },
    );
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.code).toBeNull();

    const asked = await run(node, [
      "-e",
      'process.on("SIGTERM", () => process.exit(0)); console.log("Proceed? (y/N)"); setInterval(() => {}, 1000)',
    ]);
    expect(asked.prompt).toContain("(y/N)");
    expect(asked.code).toBeNull();
  });

  it("reads a multi-byte character that arrives in two chunks", async () => {
    const result = await run(node, [
      "-e",
      'const b = Buffer.from("  ● Migrating X\\n"); process.stdout.write(b.subarray(0, 3)); setTimeout(() => process.stdout.write(b.subarray(3)), 100)',
    ]);
    expect(result.output).toBe("  ● Migrating X\n");
  });

  it("leaves a command alone when asked not to look for questions", async () => {
    const result = await run(node, ["-e", 'console.log("Continue? (y/N)")'], {
      abortOnPrompt: false,
    });
    expect(result.prompt).toBeUndefined();
    expect(result.code).toBe(0);
  });

  it("does not mistake ordinary output for a question", async () => {
    const result = await run(node, ["-e", 'console.log("saved (and/or) loaded [ok] y/n")']);
    expect(result.prompt).toBeUndefined();
  });

  it("returns an error, and does not throw, for a program that cannot start", async () => {
    const result = await run("bootstrap-test-no-such-program", []);
    expect(result.code).toBeNull();
    expect(result.error).toMatch(/ENOENT/);
  });
});
