import type { AfterErrorHook } from "payload";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * A refused save answers with its reason, field by field (`errors[0].data.errors`), which the
 * admin shows under the field. Payload's formatter keeps those details only for an error that is
 * `instanceof` its own `ValidationError`; in CI's build that check failed (PR 93) and the answer
 * kept "The following field is invalid: Value" alone, the reason lost, and the same for a page's
 * slug (PR 98). This puts the details back for any error that carries them under that name, on
 * every collection whose refusals say why (`ui-strings`, `pages`).
 */
export const keepRefusalReason: AfterErrorHook = ({ error }) => {
  const data = (error as { data?: unknown }).data;
  if (error.name !== "ValidationError" || !isRecord(data)) return;
  return { response: { errors: [{ name: error.name, data, message: error.message }] } };
};
