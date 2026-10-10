// Reading and merging `.env` files (T13, step 2 and the steps that write a key or a secret).
// Pure text in, text out: no file is touched here, so the tests need no disk. A merge changes only
// the lines it has to; every comment, blank line and other assignment stays as it was, in the same
// place, and the file keeps its line endings.
import { randomBytes } from "node:crypto";

export type EnvChange = {
  key: string;
  /**
   * `added`: the key was absent, a line was appended. `filled`: the key was there with no value.
   * `replaced`: the key had a different value and `replace` allowed overwriting it.
   * `kept`: the key had a value and stays as it is.
   */
  action: "added" | "filled" | "replaced" | "kept";
};

export type MergeOptions = {
  /** Keys whose existing value may be overwritten. By default no existing value ever is. */
  replace?: readonly string[];
};

// `KEY=value`, optionally `export KEY=value`; a commented-out line is not an assignment.
const ASSIGNMENT = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.-]*)(\s*=\s*)(.*)$/;

/** The value part of an assignment as dotenv reads it: quotes removed, an unquoted ` # comment` cut. */
function readValue(rest: string): { value: string; comment: string } {
  const quote = rest[0];
  if (quote === '"' || quote === "'") {
    const end = rest.indexOf(quote, 1);
    if (end !== -1) {
      return { value: rest.slice(1, end), comment: rest.slice(end + 1) };
    }
  }
  // The operator's own whitespace was already taken, so a comment right after `=` starts at `#`.
  if (rest.startsWith("#")) return { value: "", comment: ` ${rest}` };
  const cut = rest.search(/\s#/);
  if (cut === -1) return { value: rest.trim(), comment: "" };
  return { value: rest.slice(0, cut).trim(), comment: rest.slice(cut) };
}

function eolOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

type Found = { index: number; prefix: string; operator: string; value: string; comment: string };

/**
 * The assignment of `key` that counts. When a key is assigned twice, the last one is the value
 * dotenv gives (Next's and Medusa's loaders parse with it, and `util.parseEnv` agrees), even when
 * that last one is blank.
 */
function findAssignment(lines: string[], key: string): Found | undefined {
  let found: Found | undefined;
  for (const [index, line] of lines.entries()) {
    const match = ASSIGNMENT.exec(line);
    if (match?.[2] !== key) continue;
    const { value, comment } = readValue(match[4] ?? "");
    found = { index, prefix: match[1] ?? "", operator: match[3] ?? "=", value, comment };
  }
  return found;
}

/** The value of `key`, or `undefined` when it is absent. An empty string means it is there, blank. */
export function getEnvValue(text: string, key: string): string | undefined {
  return findAssignment(text.split(/\r?\n/), key)?.value;
}

/** True when the key is absent or has no value: `KEY=`, `KEY=""` and `KEY= # note` all count. */
export function isUnset(text: string, key: string): boolean {
  return (getEnvValue(text, key) ?? "") === "";
}

/** A value as it is written after the `=`: bare when it can be, else quoted. */
export function formatEnvValue(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error("An .env value cannot contain a line break");
  if (/^[A-Za-z0-9_@%+=:,./-]*$/.test(value)) return value;
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  throw new Error("An .env value cannot contain both kinds of quote");
}

/**
 * Sets `values` in an .env file and says what it did for each key.
 *
 * A key that has a value keeps it, unless it is listed in `replace` and the new value differs. A key
 * with no value is filled in on its own line, keeping any trailing comment. A key that is absent is
 * appended at the end. Nothing else is touched.
 */
export function mergeEnv(
  text: string,
  values: Readonly<Record<string, string>>,
  options: MergeOptions = {},
): { text: string; changes: EnvChange[] } {
  const eol = eolOf(text);
  const endsWithNewline = text === "" || /\r?\n$/.test(text);
  const lines = text === "" ? [] : text.replace(/\r?\n$/, "").split(/\r?\n/);
  const changes: EnvChange[] = [];
  const appended: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    const current = findAssignment(lines, key);
    if (current === undefined) {
      appended.push(`${key}=${formatEnvValue(value)}`);
      changes.push({ key, action: "added" });
      continue;
    }

    const blank = current.value === "";
    const replace = !blank && options.replace?.includes(key) === true && current.value !== value;
    if (!blank && !replace) {
      changes.push({ key, action: "kept" });
      continue;
    }

    lines[current.index] =
      `${current.prefix}${key}${current.operator}${formatEnvValue(value)}${current.comment}`;
    changes.push({ key, action: blank ? "filled" : "replaced" });
  }

  if (appended.length === 0 && changes.every((c) => c.action === "kept")) {
    return { text, changes };
  }

  const body = [...lines, ...appended].join(eol);
  // An unchanged ending stays unchanged; a file we only appended to always ends with a newline.
  const keepsEnding = appended.length === 0 && !endsWithNewline;
  return { text: keepsEnding ? body : body + eol, changes };
}

/** True when a merge wrote something. */
export function changedAnything(changes: readonly EnvChange[]): boolean {
  return changes.some((change) => change.action !== "kept");
}

/** A random secret for a `.env`: 32 bytes as 64 hex characters, safe to write unquoted anywhere. */
export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * A random password for the development admin: 20 characters of `A-Za-z0-9_-`. Nothing in it needs
 * quoting in a shell, in cmd.exe or in an .env file, which matters because `medusa user -p` takes it
 * as a command-line argument.
 */
export function generatePassword(): string {
  return randomBytes(15).toString("base64url");
}
