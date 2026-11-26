// M7 D142, D143 (T108): why a form was not taken when no field is to blame, as the shop's server
// action says: a rate limit's refusal, with the seconds to wait, or a Turnstile check that did not
// pass. The form block and the newsletter say it in their status line; the auth pages in their alert.

/** A refusal no field is to blame for. */
type FormRefusal = { kind: "too-many"; retryAfter: number } | { kind: "challenge" };

/** The wait said in whole minutes, at least one (a minute when the shop names none). */
function minutesToWait(retryAfter: number | undefined): number {
  const seconds = retryAfter !== undefined && Number.isFinite(retryAfter) ? retryAfter : 60;
  return Math.max(1, Math.ceil(seconds / 60));
}

export { minutesToWait };
export type { FormRefusal };
