import { describe, expect, it } from "vitest";
import { refusalOf, shown } from "./form-island-state";

// M7 D142, D143 (T108): the action's refusal as the sections' `refusal` prop.
describe("refusalOf", () => {
  const error = { status: "error" as const, errors: {}, values: { email: "a@example.com" } };

  it("is the limit's wait, or Turnstile's refusal, and nothing for any other answer", () => {
    expect(refusalOf({ ...error, form: "too-many", retryAfter: 120 })).toEqual({
      kind: "too-many",
      retryAfter: 120,
    });
    expect(refusalOf({ ...error, form: "too-many" })).toEqual({ kind: "too-many", retryAfter: 60 });
    expect(refusalOf({ ...error, form: "challenge" })).toEqual({ kind: "challenge" });
    expect(refusalOf({ ...error, form: "unavailable" })).toBeUndefined();
    expect(refusalOf({ status: "done" })).toBeUndefined();
  });

  it("is part of the section's props after an answer, never while sending", () => {
    expect(shown({ ...error, form: "challenge" }, false)).toMatchObject({
      status: "error",
      refusal: { kind: "challenge" },
    });
    expect(shown({ ...error, form: "challenge" }, true)).toEqual({ status: "sending" });
  });
});
