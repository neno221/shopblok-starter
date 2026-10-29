import type { FieldError, FormError } from "./action";

// What a form's server action answers (D81, T67), for the island that keeps it (`useActionState`)
// and for the page a form posted without scripts is drawn again with. Minimal (SPEC §11.1): the
// status, each refused field's kind and what was typed, never what was stored.

export type FormState =
  | { status: "idle" | "done" }
  | {
      status: "error";
      /** Each refused field's kind, by its name. */
      errors: Partial<Record<string, FieldError>>;
      /** What was typed, by name, to fill the form in again (a box: `"on"` or `""`). */
      values: Record<string, string>;
      /** Why, when no field is to blame. */
      form?: FormError;
    };

export const IDLE_FORM: FormState = { status: "idle" };
