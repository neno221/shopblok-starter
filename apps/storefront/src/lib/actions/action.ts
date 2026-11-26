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
  | "incomplete"
  /** M7 D142 (T108): over a rate limit; `retryAfter` says for how long. */
  | "too-many"
  /** M7 D143 (T108): Turnstile's check did not pass. */
  | "challenge";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errors: Partial<Record<string, FieldError>>;
      form?: FormError;
      /** Why, in the form's own words: a code the handler chose for the copy to match. */
      reason?: string;
      /** Medusa's refusal, for the log and for a message the copy can match (a promo code's). */
      message?: string;
      /** With `too-many`: the seconds to wait before trying again. */
      retryAfter?: number;
    };

/**
 * A failure an action's handler throws on purpose: the visitor sees `form`, and `reason` when the
 * handler gives one (a code such as `credentials`, never a sentence); `message` stays on the server.
 */
export class ActionError extends Error {
  override name = "ActionError";
  constructor(
    readonly form: FormError,
    message: string = form,
    readonly reason?: string,
    /** With `too-many`: the seconds to wait. */
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

/** M7 D142 (T108): a refusal by a rate limit, to wait `retryAfter` seconds. */
export class TooManyError extends ActionError {
  override name = "TooManyError";
  constructor(retryAfter: number, message = "too many attempts") {
    super("too-many", message, undefined, Math.max(1, Math.ceil(retryAfter)));
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
 * and a `FieldsError` answer `errors`; an `ActionError` answers its `form`; a Medusa refusal `rejected`, a Medusa
 * outage `unavailable` and Medusa's rate limit `too-many` (M7 D142, with its `retryAfter`); anything
 * else is thrown on, to the route's error boundary.
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
          ...(error.reason === undefined ? {} : { reason: error.reason }),
          ...(error.retryAfter === undefined ? {} : { retryAfter: error.retryAfter }),
        };
      if (error instanceof FieldsError) return { ok: false, errors: error.errors };
      if (error instanceof MedusaRequestError) {
        if (error.kind === "unreachable") return { ok: false, errors: {}, form: "unavailable" };
        // M7 D142 (T108): Medusa's limiter (a sign-in, a reset, a cart's completion).
        if (error.status === 429)
          return { ok: false, errors: {}, form: "too-many", retryAfter: error.retryAfter ?? 60 };
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
