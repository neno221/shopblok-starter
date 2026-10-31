// The text of a refusal: the header, then one `- reason` line each. It has no import, so the
// admin panels (a browser bundle) read it with the very functions the server writes it with.

const HEADER = "The markets were not saved:";

/** The message of a refusal: the header, then one `- reason` line for each problem. */
export function refusalMessage(problems: readonly { message: string }[]): string {
  return [HEADER, ...problems.map((problem) => `- ${problem.message}`)].join("\n");
}

/** The reasons of a refusal's message, or `undefined` when the message is not one. */
export function problemsOf(message: string): string[] | undefined {
  if (!message.startsWith(HEADER)) return undefined;
  return message
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^- /, ""))
    .filter((line) => line !== "");
}
