import { MedusaError } from "@medusajs/framework/utils";

import type { Problem } from "./types";

/**
 * A save the checks refuse. The message lists every problem, so the reason survives wherever the
 * error travels (a workflow's error is serialized); the routes read the same list back from the
 * message's lines with `problemsOf`.
 */
export class MarketsRefused extends MedusaError {
  problems: Problem[];

  constructor(problems: Problem[]) {
    super(MedusaError.Types.INVALID_DATA, refusalMessage(problems));
    this.name = "MarketsRefused";
    this.problems = problems;
  }
}

const HEADER = "The markets were not saved:";

export function refusalMessage(problems: Problem[]): string {
  return [HEADER, ...problems.map((problem) => `- ${problem.message}`)].join("\n");
}

/** The problems of a refusal's message, or `undefined` when the message is not one. */
export function problemsOf(message: string): string[] | undefined {
  if (!message.startsWith(HEADER)) return undefined;
  return message
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^- /, ""));
}
