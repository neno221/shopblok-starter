"use client";

import { NewsletterForm, type NewsletterFormProps } from "@shopblok/ui/molecules/newsletter-form";
import { useActionState } from "react";
import { IDLE_FORM } from "../../lib/actions/form-state";
import { shown, typedEmail, type Island } from "./form-island-state";

/** The footer's newsletter (D81) that keeps the forms' server action's answer. */
export function NewsletterFormIsland({
  submit,
  formId,
  permalink,
  newsletter,
  ...form
}: Island & Omit<NewsletterFormProps, "action" | "status" | "id">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, permalink ?? `#${formId}`);
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
