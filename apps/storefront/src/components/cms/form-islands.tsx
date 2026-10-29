"use client";

import { NewsletterForm, type NewsletterFormProps } from "@shopblok/ui/molecules/newsletter-form";
import { FormBlockSection, type FormBlockSectionProps } from "@shopblok/ui/sections/form-block";
import { NewsletterSection, type NewsletterSectionProps } from "@shopblok/ui/sections/newsletter";
import { useActionState } from "react";
import { IDLE_FORM, type FormState } from "../../lib/actions/form-state";

// D81's islands: each draws a form with `useActionState` around the forms' server action
// (`submitForm`, bound to the market and the form by the page), so the section shows the answer:
// sending, each refused field with what was typed, the confirmation. Without scripts the form posts
// to the page's own URL with the form's `#id` (the permalink), Next runs the action and draws the
// page again with its answer, and the browser scrolls back to the form.

type Submit = (previous: FormState, data: FormData) => Promise<FormState>;

type Island = { submit: Submit; formId: string };

/** The section's props for a state: what to mark, what to type back. */
function shown(state: FormState, pending: boolean) {
  if (pending) return { status: "sending" as const };
  if (state.status !== "error") return { status: state.status };
  return { status: "error" as const, errors: state.errors, values: state.values };
}

export function FormBlockIsland({
  submit,
  formId,
  ...section
}: Island & Omit<FormBlockSectionProps, "action" | "status" | "errors" | "values" | "formId">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, `#${formId}`);
  return (
    <FormBlockSection {...section} {...shown(state, pending)} formId={formId} action={action} />
  );
}

/** What the address field shows: what was typed after a refusal, else empty. */
function typedEmail(state: FormState, fieldName: string | undefined): string {
  return state.status === "error" ? (state.values[fieldName ?? "email"] ?? "") : "";
}

export function NewsletterSectionIsland({
  submit,
  formId,
  newsletter,
  ...section
}: Island & Omit<NewsletterSectionProps, "action" | "status" | "formId">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, `#${formId}`);
  return (
    <NewsletterSection
      {...section}
      newsletter={{ ...newsletter, email: typedEmail(state, section.fieldName) }}
      status={shown(state, pending).status}
      formId={formId}
      action={action}
    />
  );
}

export function NewsletterFormIsland({
  submit,
  formId,
  newsletter,
  ...form
}: Island & Omit<NewsletterFormProps, "action" | "status" | "id">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, `#${formId}`);
  return (
    <NewsletterForm
      {...form}
      newsletter={{ ...newsletter, email: typedEmail(state, form.fieldName) }}
      status={shown(state, pending).status}
      id={formId}
      action={action}
    />
  );
}
