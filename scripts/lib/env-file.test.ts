import { describe, expect, it } from "vitest";
import {
  changedAnything,
  formatEnvValue,
  generatePassword,
  generateSecret,
  getEnvValue,
  isUnset,
  mergeEnv,
} from "./env-file.ts";

// A cut-down apps/backend/.env.example: comments, blank lines, blank secrets, a URL.
const EXAMPLE = `# Medusa backend environment.
# Host ports follow decision D15.

# Core
DATABASE_URL=postgres://postgres:postgres@localhost:15432/medusa
# Empty on purpose: development warns and uses a default.
JWT_SECRET=
COOKIE_SECRET=
MEDUSA_BACKEND_URL=http://localhost:9000

# CMS link
PAYLOAD_API_KEY=
REVALIDATE_SECRET=
`;

describe("mergeEnv", () => {
  it("fills blank values in place and keeps every comment, blank line and other assignment", () => {
    const { text, changes } = mergeEnv(EXAMPLE, { JWT_SECRET: "aaa", COOKIE_SECRET: "bbb" });

    expect(text).toBe(
      EXAMPLE.replace("JWT_SECRET=", "JWT_SECRET=aaa").replace("COOKIE_SECRET=", "COOKIE_SECRET=bbb"),
    );
    expect(changes).toEqual([
      { key: "JWT_SECRET", action: "filled" },
      { key: "COOKIE_SECRET", action: "filled" },
    ]);
  });

  it("never overwrites a value that is there", () => {
    const existing = "JWT_SECRET=mine\nCOOKIE_SECRET='also mine'\n";
    const { text, changes } = mergeEnv(existing, { JWT_SECRET: "generated", COOKIE_SECRET: "generated" });

    expect(text).toBe(existing);
    expect(changes).toEqual([
      { key: "JWT_SECRET", action: "kept" },
      { key: "COOKIE_SECRET", action: "kept" },
    ]);
    expect(changedAnything(changes)).toBe(false);
  });

  it("returns the very same text when nothing changes, even without a final newline", () => {
    const existing = "# note\nA=1\r\nB=2";
    const result = mergeEnv(existing, { A: "x", B: "y" });
    expect(result.text).toBe(existing);
  });

  it("appends a key that is absent, after everything else, ending with a newline", () => {
    const { text, changes } = mergeEnv("A=1\n# end", { PREVIEW_SECRET: "p" });
    expect(text).toBe("A=1\n# end\nPREVIEW_SECRET=p\n");
    expect(changes).toEqual([{ key: "PREVIEW_SECRET", action: "added" }]);
  });

  it("creates a file from nothing", () => {
    expect(mergeEnv("", { A: "1", B: "2" }).text).toBe("A=1\nB=2\n");
  });

  it("does not treat a commented-out assignment as set", () => {
    const { text, changes } = mergeEnv("# CRON_SECRET=old\n", { CRON_SECRET: "new" });
    expect(text).toBe("# CRON_SECRET=old\nCRON_SECRET=new\n");
    expect(changes[0]?.action).toBe("added");
  });

  it("treats empty quotes and a value that is only a comment as blank", () => {
    const { text } = mergeEnv('A=""\nB=   # keep this note\nC=\'\'\n', { A: "1", B: "2", C: "3" });
    expect(text).toBe("A=1\nB=   2 # keep this note\nC=3\n");
  });

  it("replaces a value only for the keys listed in replace, and only when it differs", () => {
    const existing = "KEY=pk_old\nOTHER=keep\n";
    const replaced = mergeEnv(existing, { KEY: "pk_new", OTHER: "x" }, { replace: ["KEY"] });
    expect(replaced.text).toBe("KEY=pk_new\nOTHER=keep\n");
    expect(replaced.changes).toEqual([
      { key: "KEY", action: "replaced" },
      { key: "OTHER", action: "kept" },
    ]);

    const same = mergeEnv("KEY=pk_new\n", { KEY: "pk_new" }, { replace: ["KEY"] });
    expect(same.changes).toEqual([{ key: "KEY", action: "kept" }]);
    expect(same.text).toBe("KEY=pk_new\n");
  });

  it("keeps Windows line endings", () => {
    const existing = "# note\r\nA=\r\nB=2\r\n";
    const { text } = mergeEnv(existing, { A: "1", C: "3" });
    expect(text).toBe("# note\r\nA=1\r\nB=2\r\nC=3\r\n");
    expect(text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("keeps an export prefix, spacing around the equals sign and a trailing comment", () => {
    const { text } = mergeEnv("export  A = \nB=  # hmm\n", { A: "1", B: "2" });
    expect(text).toBe("export  A = 1\nB=  2 # hmm\n");
  });

  it("quotes a value that needs it", () => {
    expect(mergeEnv("", { A: "has space", B: "a#b", C: 'say "hi"' }).text).toBe(
      "A=\"has space\"\nB=\"a#b\"\nC='say \"hi\"'\n",
    );
  });

  it("rewrites nothing but the lines it changes", () => {
    const { text } = mergeEnv(EXAMPLE, { REVALIDATE_SECRET: "r", PAYLOAD_API_KEY: "k", NEW_ONE: "n" });
    const before = EXAMPLE.split("\n");
    const after = text.split("\n");
    const differing = after.filter((line, i) => line !== before[i]);
    expect(differing).toEqual(["PAYLOAD_API_KEY=k", "REVALIDATE_SECRET=r", "NEW_ONE=n", ""]);
  });
});

describe("reading", () => {
  it("getEnvValue unquotes and cuts an inline comment", () => {
    const text = 'A=plain\nB="quoted # not a comment"\nC=value # comment\nD=\nexport E=exported\n';
    expect(getEnvValue(text, "A")).toBe("plain");
    expect(getEnvValue(text, "B")).toBe("quoted # not a comment");
    expect(getEnvValue(text, "C")).toBe("value");
    expect(getEnvValue(text, "D")).toBe("");
    expect(getEnvValue(text, "E")).toBe("exported");
    expect(getEnvValue(text, "MISSING")).toBeUndefined();
  });

  it("isUnset is true for an absent key and a blank one, false otherwise", () => {
    const text = "A=\nB=1\n";
    expect(isUnset(text, "A")).toBe(true);
    expect(isUnset(text, "B")).toBe(false);
    expect(isUnset(text, "C")).toBe(true);
  });

  it("a duplicated key counts as set when any line has a value", () => {
    expect(isUnset("A=\nA=2\n", "A")).toBe(false);
    expect(getEnvValue("A=\nA=2\n", "A")).toBe("2");
  });
});

describe("formatEnvValue and generators", () => {
  it("writes URLs and hex bare", () => {
    expect(formatEnvValue("postgres://u:p@localhost:15432/db")).toBe("postgres://u:p@localhost:15432/db");
    expect(formatEnvValue("")).toBe("");
  });

  it("refuses a value that cannot be written safely", () => {
    expect(() => formatEnvValue("a\nb")).toThrow(/line break/);
    expect(() => formatEnvValue(`it's "both"`)).toThrow(/quote/);
  });

  it("generates secrets that are long, random and safe to write bare", () => {
    const a = generateSecret();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSecret()).not.toBe(a);
    expect(formatEnvValue(a)).toBe(a);
  });

  it("generates a password that needs no quoting in a shell, in cmd.exe or in an .env file", () => {
    const password = generatePassword();
    expect(password).toMatch(/^[A-Za-z0-9_-]{20}$/);
    expect(formatEnvValue(password)).toBe(password);
  });
});
