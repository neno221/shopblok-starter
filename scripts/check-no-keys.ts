// `pnpm check:keys` (M6 D115, T93): fails when a file in the repository holds a Stripe, Resend or
// AWS-style key. CI's `check` job runs it beside `check:workspace`, on every push and pull request.
// Run with plain `node scripts/check-no-keys.ts` from the repo root.
//
// It reads every file git tracks (`git ls-files`), which covers a pull request's changed files and
// everything else, in about a second; binaries (the baselines) are skipped by their first 8 KB, and
// so is any file over 5 MB (none is text). `--files a b c` checks just those files instead (what a
// pre-commit hook would pass). A finding names the file, the line and the kind of key, never the key.
// The patterns and the allow-list of fixtures' fake keys are in `lib/no-keys.ts`.
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import path from "node:path";
import { describeFindings, findKeys, isBinary, type Finding } from "./lib/no-keys.ts";

const root = path.resolve(import.meta.dirname, "..");
const MAX_BYTES = 5 * 1024 * 1024;

function trackedFiles(): string[] {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return output.split("\0").filter((file) => file !== "");
}

function head(file: string): Uint8Array {
  const buffer = Buffer.alloc(8192);
  const fd = openSync(file, "r");
  try {
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

const listed = process.argv.indexOf("--files");
const files = listed === -1 ? trackedFiles() : process.argv.slice(listed + 1);

const findings: Finding[] = [];
let read = 0;
for (const file of files) {
  const absolute = path.resolve(root, file);
  let size: number;
  try {
    const stat = statSync(absolute);
    if (!stat.isFile()) continue;
    size = stat.size;
  } catch {
    // Deleted in the working tree, or a submodule: nothing to read.
    continue;
  }
  if (size > MAX_BYTES || isBinary(head(absolute))) continue;
  read += 1;
  findings.push(...findKeys(path.relative(root, absolute), readFileSync(absolute, "utf8")));
}

if (findings.length > 0) {
  for (const line of describeFindings(findings)) console.error(line);
  console.error(
    `\ncheck:keys: ${findings.length} key-shaped ${findings.length === 1 ? "string" : "strings"} in the files above. Remove the key, and revoke it in the service's dashboard if it was ever real (pushed, logged or shared): a key in git history stays readable. A test fixture's fake key goes into ALLOWED_FAKE_KEYS in scripts/lib/no-keys.ts.`,
  );
  if (process.env["GITHUB_ACTIONS"] === "true") {
    for (const f of findings) {
      console.log(`::error file=${f.file},line=${f.line},title=Key in a file::A ${f.name}.`);
    }
  }
  process.exit(1);
}
console.log(`check:keys: no key in ${read} files.`);
