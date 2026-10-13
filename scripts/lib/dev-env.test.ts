import { describe, expect, it } from "vitest";
import { devEnvironment } from "./dev-env.ts";

// What pnpm 12 from `npm install -g` looks like on Windows: npm's `pnpm.cmd` shim in `npm`, the
// native binary it calls in `npm\node_modules\pnpm` (W2's PC).
const npmFolder = String.raw`C:\Users\me\AppData\Roaming\npm`;
const pnpmFolder = String.raw`C:\Users\me\AppData\Roaming\npm\node_modules\pnpm`;
const windows = {
  npm_execpath: `${pnpmFolder}\\pnpm.exe`,
  Path: String.raw`E:\shop\node_modules\.bin;C:\Windows\system32;${npmFolder}`,
  npm_lifecycle_event: "dev",
};

describe("devEnvironment", () => {
  it("puts the folder of the running pnpm.exe first on Windows, so turbo finds no pnpm.cmd before it", () => {
    const env = devEnvironment({ ...windows }, "win32");
    expect(env.Path).toBe(`${pnpmFolder};${windows.Path}`);
    expect(env.Path?.split(";").indexOf(pnpmFolder)).toBeLessThan(
      env.Path?.split(";").indexOf(npmFolder) ?? -1,
    );
    expect(env.npm_lifecycle_event).toBe("dev");
  });

  it("changes the PATH variable whatever the case of its name, and adds no second one", () => {
    const env = devEnvironment({ npm_execpath: windows.npm_execpath, PATH: "C:\\a" }, "win32");
    expect(env).toEqual({ npm_execpath: windows.npm_execpath, PATH: `${pnpmFolder};C:\\a` });
  });

  it("sets PATH when there is none", () => {
    expect(devEnvironment({ npm_execpath: windows.npm_execpath }, "win32").Path).toBe(pnpmFolder);
  });

  it("leaves the environment it was given unchanged", () => {
    const given = { ...windows };
    devEnvironment(given, "win32");
    expect(given).toEqual(windows);
  });

  it("changes nothing when the folder is first already (pnpm's standalone install)", () => {
    const given = { ...windows, Path: `${pnpmFolder.toLowerCase()};C:\\Windows` };
    expect(devEnvironment(given, "win32")).toBe(given);
  });

  it("changes nothing for a pnpm that is not an .exe, or when pnpm did not start it", () => {
    const script = { ...windows, npm_execpath: `${pnpmFolder}\\bin\\pnpm.cjs` };
    expect(devEnvironment(script, "win32")).toBe(script);
    const bare = { Path: windows.Path };
    expect(devEnvironment(bare, "win32")).toBe(bare);
  });

  it("changes nothing on Linux and macOS, where turbo starts a task without a batch file", () => {
    const linux = { npm_execpath: "/usr/local/lib/node_modules/pnpm/pnpm", PATH: "/usr/bin" };
    expect(devEnvironment(linux, "linux")).toBe(linux);
    const exe = { ...windows };
    expect(devEnvironment(exe, "darwin")).toBe(exe);
  });
});
