import "server-only";
import type { z } from "zod";
import { getCustomer, type CustomerDto } from "../medusa/customer";
import { MedusaRequestError } from "../medusa/sdk";

// The server actions' one shape (D48, D60, SPEC §11.1): every input is checked with zod, the
// customer is read again from the JWT cookie when the action needs one, and the answer is plain
// data the caller built from DTOs, never a Medusa object. A form's no-script post calls the same
// function: `useActionState` hands it `(previousState, formData)`, a client call `(input)`.

/** What is wrong with a field: T34's kinds (AddressForm, the auth forms). */
export type FieldError = "required" | "pattern" | "invalid";

/** Why the whole action failed, when no field is to blame. */
export type FormError =
  /** The input names something that is not the visitor's (another cart's line, another's order). */
  | "not-found"
  /** The action needs a signed-in customer and there is none. */
  | "unauthorized"
  /** Medusa refused the change (stock gone, a code that does not apply). */
  | "rejected"
  /** Medusa did not answer. */
  | "unavailable"
  /** A step before this one is not done (the checkout's: no address before the delivery). */
  | "incomplete";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Partial<Record<string, FieldError>>; form?: FormError; message?: string };

/** A failure an action's handler throws on purpose: the visitor sees `form`. */
export class ActionError extends Error {
  override name = "ActionError";
  constructor(
    readonly form: FormError,
    message: string = form,
  ) {
    super(message);
  }
}

/** A failure a handler finds in a field after the schema (an address its country refuses). */
export class FieldsError extends Error {
  override name = "FieldsError";
  constructor(readonly errors: Partial<Record<string, FieldError>>) {
    super(`fields: ${Object.keys(errors).join(", ")}`);
  }
}

/** zod's issues as one kind per field, keyed by the field's path (`shipping.city`). */
export function toFieldErrors(
  issues: readonly z.core.$ZodIssue[],
): Partial<Record<string, FieldError>> {
  const errors: Partial<Record<string, FieldError>> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (errors[key] !== undefined) continue;
    const empty =
      (issue.code === "invalid_type" && issue.input === undefined) ||
      (issue.code === "too_small" && issue.origin === "string" && issue.minimum === 1);
    errors[key] = empty ? "required" : issue.code === "invalid_format" ? "pattern" : "invalid";
  }
  return errors;
}

/** A form's fields as an object: a name given twice becomes a list. Server actions' own ids skip. */
export function formDataToObject(data: FormData): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const [name, value] of data.entries()) {
    if (name.startsWith("$ACTION_")) continue;
    const entry = typeof value === "string" ? value : value.name;
    const existing = object[name];
    object[name] =
      existing === undefined
        ? entry
        : Array.isArray(existing)
          ? [...existing, entry]
          : [existing, entry];
  }
  return object;
}

type Options = {
  /** `customer`: the handler runs only for a signed-in customer, read from the JWT cookie now. */
  auth?: "none" | "customer";
};

type Context<Auth> = Auth extends "customer"
  ? { customer: CustomerDto }
  : { customer: CustomerDto | null };

/**
 * Wraps a handler as a server action's body. The handler gets the parsed input and, with
 * `auth: "customer"`, the customer; what it returns is the `data` of `{ ok: true }`. A zod failure
 * and a `FieldsError` answer `errors`; an `ActionError` answers its `form`; a Medusa refusal `rejected` and a Medusa
 * outage `unavailable`; anything else is thrown on, to the route's error boundary.
 */
export function action<Schema extends z.ZodType, Result, Auth extends "none" | "customer" = "none">(
  schema: Schema,
  handler: (input: z.output<Schema>, context: Context<Auth>) => Promise<Result>,
  options: Options & { auth?: Auth } = {},
): (...args: [unknown] | [unknown, unknown]) => Promise<ActionResult<Result>> {
  return async (...args) => {
    const raw = args.length > 1 ? args[1] : args[0];
    const input = raw instanceof FormData ? formDataToObject(raw) : raw;
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error.issues) };
    try {
      const customer = options.auth === "customer" ? await getCustomer() : null;
      if (options.auth === "customer" && customer === null)
        return { ok: false, errors: {}, form: "unauthorized" };
      const data = await handler(parsed.data, { customer } as Context<Auth>);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof ActionError)
        return {
          ok: false,
          errors: {},
          form: error.form,
          ...(error.message === error.form ? {} : { message: error.message }),
        };
      if (error instanceof FieldsError) return { ok: false, errors: error.errors };
      if (error instanceof MedusaRequestError) {
        if (error.kind === "unreachable") return { ok: false, errors: {}, form: "unavailable" };
        if (error.status === 404) return { ok: false, errors: {}, form: "not-found" };
        if (error.status === 401) return { ok: false, errors: {}, form: "unauthorized" };
        // Medusa's own words, for the log and for a message the copy can match (a promo code's).
        return { ok: false, errors: {}, form: "rejected", message: rejection(error) };
      }
      throw error;
    }
  };
}

/** Medusa's message without the URL and status `MedusaRequestError` puts in front of it. */
function rejection(error: MedusaRequestError): string {
  const cause = error.cause;
  return cause instanceof Error ? cause.message : error.message;
}
