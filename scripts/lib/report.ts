// What `pnpm run doctor` prints (T14): a list of checks, each ok, a warning or an error, and the
// integrations table. Pure functions from the report to text or JSON, so a test can read what a
// person or CI would. Nothing here knows how a check was made.
import { describeIntegration, type IntegrationStatus } from "./integrations.ts";
import { redact } from "./output.ts";

export type Level = "ok" | "warn" | "error";

export type Check = {
  /** Stable, for `--json` and for CI to key on. */
  id: string;
  title: string;
  level: Level;
  /** What was found, in a sentence or two. Never holds a secret. */
  message: string;
  /** Specifics, one per line: every market mismatch, every missing key. */
  details?: string[];
  /** What to do about it. */
  fix?: string;
};

export type Report = {
  integrations: IntegrationStatus[];
  checks: Check[];
};

export type ReportOptions = { strict: boolean; online: boolean };

/** `--strict` turns a warning into an error. */
export function effectiveLevel(level: Level, strict: boolean): Level {
  return strict && level === "warn" ? "error" : level;
}

export function summarize(
  checks: readonly Check[],
  strict: boolean,
): { ok: number; warn: number; error: number } {
  const count = { ok: 0, warn: 0, error: 0 };
  for (const check of checks) count[effectiveLevel(check.level, strict)]++;
  return count;
}

/** 0 when there is no error (warnings only count with `--strict`), else 1. */
export function exitCodeOf(report: Report, options: ReportOptions): 0 | 1 {
  return summarize(report.checks, options.strict).error > 0 ? 1 : 0;
}

const ICON: Record<Level, string> = { ok: "✓", warn: "!", error: "✗" };

const clean = (text: string): string => redact(text);

/** The table a person reads. */
export function renderText(report: Report, options: ReportOptions): string {
  const lines: string[] = [];

  lines.push("Integrations");
  const width = Math.max(...report.integrations.map((integration) => integration.name.length));
  for (const integration of report.integrations) {
    const name = integration.name.padEnd(width);
    const state = integration.state.padEnd(8);
    const { using, why } = describeIntegration(integration);
    lines.push(`  ${name}  ${state}  ${clean(using)}`);
    if (why !== undefined) lines.push(`  ${" ".repeat(width)}  ${" ".repeat(8)}  ${clean(why)}`);
  }
  lines.push("");

  lines.push("Checks");
  for (const check of report.checks) {
    const level = effectiveLevel(check.level, options.strict);
    const icon = ICON[level];
    if (check.level === "ok" && check.details === undefined) {
      lines.push(`  ${icon} ${check.title}: ${clean(check.message)}`);
      continue;
    }
    // A warning that --strict turned into an error keeps its own wording and says why it fails.
    const suffix = level !== check.level ? " (warning, fails under --strict)" : "";
    lines.push(`  ${icon} ${check.title}${suffix}`);
    lines.push(`      ${clean(check.message)}`);
    for (const detail of check.details ?? []) lines.push(`      - ${clean(detail)}`);
    if (check.fix) lines.push(`      → ${clean(check.fix)}`);
  }
  lines.push("");

  const count = summarize(report.checks, options.strict);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  lines.push(
    `${plural(count.ok, "check")} ok, ${plural(count.warn, "warning")}, ${plural(count.error, "error")}${options.strict ? " (--strict)" : ""}.`,
  );
  return lines.join("\n");
}

/** The JSON a script reads. Names and states only: no value from an .env file is ever put in it. */
export function renderJson(report: Report, options: ReportOptions): string {
  const count = summarize(report.checks, options.strict);
  const body = {
    ok: exitCodeOf(report, options) === 0,
    strict: options.strict,
    online: options.online,
    summary: count,
    integrations: report.integrations,
    checks: report.checks.map((check) => ({
      ...check,
      message: clean(check.message),
      ...(check.details === undefined ? {} : { details: check.details.map(clean) }),
      ...(check.fix === undefined ? {} : { fix: clean(check.fix) }),
    })),
  };
  return JSON.stringify(body, null, 2);
}
