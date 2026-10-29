"use client";

import { NewsletterSection, type NewsletterSectionProps } from "@shopblok/ui/sections/newsletter";
import { useActionState } from "react";
import { IDLE_FORM } from "../../lib/actions/form-state";
import { shown, typedEmail, type Island } from "./form-island-state";

/** A `newsletter` block (D81) that keeps the forms' server action's answer. */
export function NewsletterSectionIsland({
  submit,
  formId,
  permalink,
  newsletter,
  ...section
}: Island & Omit<NewsletterSectionProps, "action" | "status" | "formId">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, permalink ?? `#${formId}`);
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
