import "server-only";
import { FORM_LIMITS } from "@shopblok/registry/contracts";
import { z } from "zod";
import { isFormPlaced, readForm } from "../cms/forms";
import { getPayloadClient } from "../cms/payload";
import { answersSchema, HONEYPOT_FIELD, submissionData } from "../forms/fields";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { action, ActionError, FieldsError, toFieldErrors, type ActionResult } from "./action";
import type { FormState } from "./form-state";

// The forms' server action (D81, SPEC §7.8 and §11): a post to a form built in the admin is checked
// against that form's own fields and stored through the Local API, the only way in, since the
// plugin's REST `create` is closed. In order: the spam trap, the market, the form (one a visitor can
// reach), the answers' schema built from its fields (each kind, `required`, the size limits), then
// the submission.

/** The bound part (the market's key, the form's id) and the answers, as `submitForm` hands them. */
export const FormPost = z.object({
  market: z.string().min(1).max(64),
  form: z.string().regex(/^[1-9][0-9]{0,11}$/),
  answers: z.record(z.string(), z.unknown()),
});

/** Whether the post was stored: a bot that filled the spam trap is not, and is told nothing. */
export type FormAnswer = { stored: boolean };

/** Whether the spam trap holds anything: posted twice, it arrives as a list (`formDataToObject`). */
const filled = (trap: unknown): boolean =>
  Array.isArray(trap) ? trap.some(filled) : typeof trap === "string" && trap.trim() !== "";

/** The form a post names, in the market's language, when a visitor can reach it; else `null`. */
async function placedForm(market: string, form: string) {
  const found = findMarket(await getRenderMarketMap(), market);
  if (found === undefined) return null;
  const reader = { market: found, draft: false };
  const [read, placed] = await Promise.all([
    readForm(reader, Number(form)),
    isFormPlaced(reader, Number(form)),
  ]);
  return placed ? read : null;
}

export const submitFormAction = action(FormPost, async ({ market, form, answers }) => {
  // The spam trap first: a bot gets the same "thank you" as a person, whatever else it sent.
  if (filled(answers[HONEYPOT_FIELD])) return { stored: false };
  const read = await placedForm(market, form);
  if (read === null) throw new ActionError("not-found", `form: no form ${form} in "${market}"`);
  const parsed = answersSchema(read.fields).safeParse(answers);
  if (!parsed.success) throw new FieldsError(toFieldErrors(parsed.error.issues));
  try {
    const payload = await getPayloadClient();
    await payload.create({
      collection: "form-submissions",
      data: { form: read.id, submissionData: submissionData(read.fields, parsed.data) },
      depth: 0,
      // REST `create` is closed to everyone (`payload/forms.ts`); this action is the way in.
      overrideAccess: true,
      user: null,
    });
  } catch (error) {
    console.error("form: the submission could not be stored", error);
    throw new ActionError("unavailable", "form: the submission could not be stored");
  }
  return { stored: true };
});

/**
 * The names of the fields a post's form draws, to fill them in again after a refusal: none when the
 * post names no form a visitor can reach.
 */
export async function postedFieldNames(bound: Record<string, unknown>): Promise<string[]> {
  const parsed = FormPost.pick({ market: true, form: true }).safeParse(bound);
  if (!parsed.success) return [];
  const read = await placedForm(parsed.data.market, parsed.data.form).catch(() => null);
  return (read?.fields ?? []).flatMap((field) => (field.kind === "message" ? [] : [field.name]));
}

/** What a form sent, as text to fill it in again: its own fields only, each cut to a field's most. */
function typedBack(
  answers: Record<string, unknown>,
  names: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    names.flatMap((name) => {
      const value = answers[name];
      return typeof value === "string" ? [[name, value.slice(0, FORM_LIMITS.textarea)]] : [];
    }),
  );
}

/**
 * The action's result as the island's state: `done` for a person and for a bot alike. After a
 * refusal, what was typed in `names`, the form's own fields (`postedFieldNames`).
 */
export function formState(
  result: ActionResult<FormAnswer>,
  answers: Record<string, unknown>,
  names: readonly string[],
): FormState {
  if (result.ok) return { status: "done" };
  return {
    status: "error",
    errors: result.errors,
    values: typedBack(answers, names),
    ...(result.form === undefined ? {} : { form: result.form }),
  };
}
