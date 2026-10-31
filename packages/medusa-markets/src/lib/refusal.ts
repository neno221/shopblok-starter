import { MedusaError } from "@medusajs/framework/utils";

import { refusalMessage } from "./refusal-text";
import type { Problem } from "./types";

// The message's header and lines live in `refusal-text.ts`, which the admin panels read too.
export { problemsOf, refusalMessage } from "./refusal-text";

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
