"use server";

import { formDataToObject } from "./action";
import { formState, submitFormAction } from "./form-handlers";
import type { FormState } from "./form-state";

// The forms' server action (D81). The page binds the market's key and the form's id
// (`submitForm.bind(null, { market, form })`) and the island hands it to `useActionState`, which
// calls it with the previous state and the form's data: the same call for a form React sends and
// for one posted before any script ran, which Next answers with the page drawn again with this
// state. The bound part comes from the page's HTML, so it is checked like the answers.

export async function submitForm(
  bound: unknown,
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const answers = formDataToObject(data);
  const { market, form } = (typeof bound === "object" && bound !== null ? bound : {}) as Record<
    string,
    unknown
  >;
  return formState(await submitFormAction({ market, form, answers }), answers);
}
