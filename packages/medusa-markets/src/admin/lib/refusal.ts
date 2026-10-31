// A refused save, as the panels show it. The routes answer 400 `{ type, message, problems }`, but
// the JS SDK's `FetchError` keeps only the `message`, and the plugin's message lists every problem
// (`refusalMessage` in `src/lib/refusal.ts`: the header, then one `- reason` line each). The panels
// read the reasons back from those lines; a unit test keeps the two in step.

const HEADER = "The markets were not saved:";

/** The reasons of a refusal's message, or `undefined` when the message is not a refusal. */
export const refusalReasons = (message: string): string[] | undefined => {
  if (!message.startsWith(HEADER)) return undefined;
  return message
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^- /, ""))
    .filter((line) => line !== "");
};

/** What to show for a failed save: the refusal's reasons, or the error's own text. */
export const failureOf = (error: unknown): { reasons: string[]; message: string } => {
  const message = error instanceof Error ? error.message : String(error);
  return { reasons: refusalReasons(message) ?? [], message };
};
