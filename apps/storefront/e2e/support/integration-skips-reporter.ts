// T103: the reporter that holds `integrations-live` to `integration-skips.ts`'s rule. CI's job adds
// it beside the list reporter (`--reporter=list,./e2e/support/integration-skips-reporter.ts`); it
// does nothing unless `E2E_EXPECT_LIVE` is set, so a run on a PC is unchanged. At the end it prints
// what it found and fails the run on a problem (a reporter's `onEnd` may set the run's status).
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { judgeSkips, parseExpected, type Outcome } from "./integration-skips";

export default class IntegrationSkipsReporter implements Reporter {
  private readonly expected = parseExpected(process.env["E2E_EXPECT_LIVE"]);
  /** The last result of each test (a retry replaces the one before). */
  private readonly outcomes = new Map<string, Outcome>();

  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (this.expected === undefined) return;
    const annotations = [...test.annotations, ...result.annotations];
    this.outcomes.set(test.id, {
      file: test.location.file,
      title: test.title,
      status: result.status,
      skipReasons: annotations
        .filter((annotation) => annotation.type === "skip")
        .map((annotation) => annotation.description ?? ""),
    });
  }

  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] } | undefined> {
    if (this.expected === undefined) return undefined;
    const { problems, notices } = judgeSkips([...this.outcomes.values()], this.expected);
    const lines = [
      `\nIntegration specs (T103), with the keys the job holds for: ${this.expected.join(", ") || "none"}`,
      ...notices.map((notice) => `  - ${notice}`),
      ...problems.map((problem) => `  ✗ ${problem}`),
      problems.length === 0
        ? "  ✓ no spec was skipped for a key the job holds."
        : `  ${problems.length} problem(s): the run fails.`,
    ];
    process.stdout.write(`${lines.join("\n")}\n`);
    return problems.length > 0 && result.status === "passed" ? { status: "failed" } : undefined;
  }
}
