import type { Dispatch, SetStateAction } from "react";

import { problemsOf } from "../../lib/refusal-text";

// A refused save, as the panels show it. The routes answer 400 `{ type, message, problems }`, but
// the JS SDK's `FetchError` keeps only the `message`, and the plugin's message lists every problem
// (the header, then one `- reason` line each). The panels read the reasons back from those lines
// with the function the server reads them with (`src/lib/refusal-text.ts`, shared on purpose).

/**
 * W6 item 5: wraps a form field's setter so that the first change after a refused save clears the
 * refusal. It is about the values that were sent, which the change may have fixed; the next Save
 * checks everything again.
 */
export const clearsRefusal =
  (save: { isError: boolean; reset: () => void }) =>
  <T>(set: Dispatch<SetStateAction<T>>) =>
  (value: SetStateAction<T>) => {
    if (save.isError) save.reset();
    set(value);
  };

/** What to show for a failed save: the refusal's reasons, or the error's own text. */
export const failureOf = (error: unknown): { reasons: string[]; message: string } => {
  const message = error instanceof Error ? error.message : String(error);
  return { reasons: problemsOf(message) ?? [], message };
};
