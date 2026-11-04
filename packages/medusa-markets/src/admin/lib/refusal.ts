import { problemsOf } from "../../lib/refusal-text";

// A refused save, as the panels show it. The routes answer 400 `{ type, message, problems }`, but
// the JS SDK's `FetchError` keeps only the `message`, and the plugin's message lists every problem
// (the header, then one `- reason` line each). The panels read the reasons back from those lines
// with the function the server reads them with (`src/lib/refusal-text.ts`, shared on purpose).

/**
 * W6 item 5: what a change to a field does to a save's refusal. A refusal is about the values that
 * were sent, which the change may have fixed, so a change after it clears it ("reset"); a change
 * while the save is still on its way clears the refusal it brings back ("remember"). The next Save
 * checks everything again. `useClearingState` (use-refusal.ts) acts on it.
 */
export const refusalOnEdit = (save: {
  isError: boolean;
  isPending: boolean;
}): "reset" | "remember" | "none" => (save.isError ? "reset" : save.isPending ? "remember" : "none");

/** What to show for a failed save: the refusal's reasons, or the error's own text. */
export const failureOf = (error: unknown): { reasons: string[]; message: string } => {
  const message = error instanceof Error ? error.message : String(error);
  return { reasons: problemsOf(message) ?? [], message };
};
