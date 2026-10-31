import type { MedusaResponse } from "@medusajs/framework/http";

import { MarketsRefused, problemsOf } from "../lib/refusal";
import type { Problem } from "../lib/types";

/**
 * Answers 400 with every reason when `error` is a refusal of the checks, and returns whether it
 * was one. Anything else is left to Medusa's error handler (a 500).
 */
export function answerRefusal(error: unknown, res: MedusaResponse): boolean {
  const refused = refusalOf(error);
  if (refused === undefined) return false;
  res.status(400).json({
    type: "invalid_data",
    message: refused.message,
    problems: refused.problems,
  });
  return true;
}

function refusalOf(error: unknown): { message: string; problems: Problem[] } | undefined {
  if (error instanceof MarketsRefused) return { message: error.message, problems: error.problems };
  // A workflow hands its error back serialized: the class is gone, the message and any own
  // properties stay.
  if (typeof error !== "object" || error === null) return undefined;
  const { message, problems } = error as { message?: unknown; problems?: unknown };
  if (typeof message !== "string") return undefined;
  if (Array.isArray(problems)) return { message, problems: problems as Problem[] };
  const lines = problemsOf(message);
  return lines === undefined
    ? undefined
    : { message, problems: lines.map((line) => ({ code: "refused", message: line })) };
}
