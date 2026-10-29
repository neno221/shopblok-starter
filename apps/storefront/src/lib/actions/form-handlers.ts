import "server-only";
import { FORM_LIMITS } from "@shopblok/registry/contracts";
import { z } from "zod";
import { readForm } from "../cms/forms";
import { getPayloadClient } from "../cms/payload";
import { answersSchema, HONEYPOT_FIELD, submissionData } from "../forms/fields";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { action, ActionError, FieldsError, toFieldErrors, type ActionResult } from "./action";
import type { FormState } from "./form-state";

// The forms' server action (D81, SPEC §7.8 and §11): a post to a form built in the admin is checked
// against that form's own fields and stored through the Local API, the only way in, since the
// plugin's REST `create` is closed. In order: the spam trap, the market, the form, the answers'
// schema built from its fields (each kind, `required`, the size limits), then the submission.

/** The bound part (the market's key, the form's id) and the answers, as `submitForm` hands them. */
export const FormPost = z.object({
  market: z.string().min(1).max(64),
  form: z.string().regex(/^[1-9][0-9]{0,11}$/),
  answers: z.record(z.string(), z.unknown()),
});

/** Whether the post was stored: a bot that filled the spam trap is not, and is told nothing. */
export type FormAnswer = { stored: boolean };

export const submitFormAction = action(FormPost, async ({ market, form, answers }) => {
  // The spam trap first: a bot gets the same "thank you" as a person, whatever else it sent.
  const trap = answers[HONEYPOT_FIELD];
  if (typeof trap === "string" && trap.trim() !== "") return { stored: false };
  const found = findMarket(await getRenderMarketMap(), market);
  if (found === undefined) throw new ActionError("not-found", `form: no market "${market}"`);
  const read = await readForm({ market: found, draft: false }, Number(form));
  if (read === null) throw new ActionError("not-found", `form: no form ${form}`);
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

/** What a form sent, as text to fill it in again: its own fields only, each cut to a field's most. */
function typedBack(answers: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(answers).flatMap(([name, value]) =>
      name === HONEYPOT_FIELD || name.startsWith("$ACTION") || typeof value !== "string"
        ? []
        : [[name, value.slice(0, FORM_LIMITS.textarea)]],
    ),
  );
}

/** The action's result as the island's state: `done` for a person and for a bot alike. */
export function formState(
  result: ActionResult<FormAnswer>,
  answers: Record<string, unknown>,
): FormState {
  if (result.ok) return { status: "done" };
  return {
    status: "error",
    errors: result.errors,
    values: typedBack(answers),
    ...(result.form === undefined ? {} : { form: result.form }),
  };
}
