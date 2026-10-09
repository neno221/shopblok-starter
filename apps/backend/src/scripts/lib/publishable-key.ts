/**
 * The line `print-publishable-key.ts` writes, and how to find it again.
 *
 * `medusa exec` shares stdout with Medusa's own log lines (and their colour
 * codes), so a caller can't parse the whole output as JSON: it looks for the
 * one line that is the JSON object. T13's bootstrap does.
 */

export function formatPublishableKey(token: string): string {
  return JSON.stringify({ publishableKey: token });
}

/** The key from `medusa exec` output, or `undefined` when no such line is there. */
export function extractPublishableKey(output: string): string | undefined {
  const keys: string[] = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed.startsWith('{"publishableKey":')) {
      continue;
    }

    try {
      const { publishableKey } = JSON.parse(trimmed) as { publishableKey?: unknown };

      if (typeof publishableKey === "string" && publishableKey.startsWith("pk_")) {
        keys.push(publishableKey);
      }
    } catch {
      // A log line that merely starts the same way; not ours.
    }
  }

  // The script prints it last, so the last one wins if a log line ever matched.
  return keys.at(-1);
}
