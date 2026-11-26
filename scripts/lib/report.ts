// What `pnpm run doctor` prints (T14): a list of checks, each ok, a warning or an error, and the
// integrations table. Pure functions from the report to text or JSON, so a test can read what a
// person or CI would. Nothing here knows how a check was made.
import {
  describeIntegration,
  type IntegrationId,
  type IntegrationStatus,
} from "@shopblok/integrations";
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
  /**
   * A warning these keys cannot clear (T103): doctor could not look, because the keys it holds may
   * not read the setting, and a person checks it in the service's dashboard instead (R2's CORS rules
   * with the apps' Object Read & Write token, which cannot read bucket settings). `--strict` leaves it
   * a warning and says so: no key the apps hold would turn it green.
   */
  byHand?: true;
};

export type Report = {
  integrations: IntegrationStatus[];
  checks: Check[];
};

export type ReportOptions = {
  strict: boolean;
  online: boolean;
  /** `--only`: the integrations whose checks the report keeps (T103); every check when absent. */
  only?: readonly IntegrationId[];
};

/**
 * The integration a check is about, from its id (T103: `--only`, and the JSON's `integration`), or
 * `undefined` for the setup's own checks (the containers, the servers, the secrets, the markets,
 * Payload's key). A check's id starts with its integration's (`stripe-key`, `r2-cors`), with a few
 * older names: the half-set warning `integration-<id>`, the containers `redis` and `meilisearch`,
 * Meilisearch's `search-*`, Resend's `email-verification` and R2's `vercel-storage`.
 */
export function integrationOf(checkId: string): IntegrationId | undefined {
  const half = /^integration-(.+)$/.exec(checkId)?.[1];
  const id = half ?? checkId;
  if (id === "email-verification") return "resend";
  if (id === "vercel-storage") return "r2";
  if (id.startsWith("search-")) return "meilisearch";
  const prefix = /^(stripe|resend|posthog|sentry|meilisearch|redis|r2)(?:-|$)/.exec(id)?.[1];
  return prefix as IntegrationId | undefined;
}

/** The checks `--only` keeps: those about one of `only`'s integrations. */
export function scopeChecks(checks: readonly Check[], only: readonly IntegrationId[] | undefined) {
  if (only === undefined) return [...checks];
  return checks.filter((check) => {
    const integration = integrationOf(check.id);
    return integration !== undefined && only.includes(integration);
  });
}

/** `--strict` turns a warning into an error, but for one the keys cannot clear (`byHand`). */
export function effectiveLevel(check: Pick<Check, "level" | "byHand">, strict: boolean): Level {
  return strict && check.level === "warn" && check.byHand !== true ? "error" : check.level;
}

export function summarize(
  checks: readonly Pick<Check, "level" | "byHand">[],
  strict: boolean,
): { ok: number; warn: number; error: number } {
  const count = { ok: 0, warn: 0, error: 0 };
  for (const check of checks) count[effectiveLevel(check, strict)]++;
  return count;
}

/** 0 when there is no error (warnings only count with `--strict`), else 1. Within `--only`'s checks. */
export function exitCodeOf(report: Report, options: ReportOptions): 0 | 1 {
  return summarize(scopeChecks(report.checks, options.only), options.strict).error > 0 ? 1 : 0;
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

  const checks = scopeChecks(report.checks, options.only);
  lines.push(options.only === undefined ? "Checks" : `Checks (--only ${options.only.join(", ")})`);
  for (const check of checks) {
    const level = effectiveLevel(check, options.strict);
    const icon = ICON[level];
    if (check.level === "ok" && check.details === undefined) {
      lines.push(`  ${icon} ${check.title}: ${clean(check.message)}`);
      continue;
    }
    // A warning that --strict turned into an error keeps its own wording and says why it fails.
    // One the keys cannot clear stays a warning under --strict, and says what to look at by hand.
    const suffix =
      level !== check.level
        ? " (warning, fails under --strict)"
        : options.strict && check.byHand === true
          ? " (warning these keys cannot clear: check it by hand; --strict leaves it a warning)"
          : "";
    lines.push(`  ${icon} ${check.title}${suffix}`);
    lines.push(`      ${clean(check.message)}`);
    for (const detail of check.details ?? []) lines.push(`      - ${clean(detail)}`);
    if (check.fix) lines.push(`      → ${clean(check.fix)}`);
  }
  lines.push("");

  const count = summarize(checks, options.strict);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  lines.push(
    `${plural(count.ok, "check")} ok, ${plural(count.warn, "warning")}, ${plural(count.error, "error")}${options.strict ? " (--strict)" : ""}.`,
  );
  return lines.join("\n");
}

/** The JSON a script reads. Names and states only: no value from an .env file is ever put in it. */
export function renderJson(report: Report, options: ReportOptions): string {
  const checks = scopeChecks(report.checks, options.only);
  const count = summarize(checks, options.strict);
  const body = {
    ok: exitCodeOf(report, options) === 0,
    strict: options.strict,
    online: options.online,
    ...(options.only === undefined ? {} : { only: options.only }),
    summary: count,
    integrations: report.integrations,
    checks: checks.map((check) => ({
      ...check,
      ...(integrationOf(check.id) === undefined ? {} : { integration: integrationOf(check.id) }),
      message: clean(check.message),
      ...(check.details === undefined ? {} : { details: check.details.map(clean) }),
      ...(check.fix === undefined ? {} : { fix: clean(check.fix) }),
    })),
  };
  return JSON.stringify(body, null, 2);
}
