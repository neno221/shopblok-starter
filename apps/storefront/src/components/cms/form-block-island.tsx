"use client";

import { FormBlockSection, type FormBlockSectionProps } from "@shopblok/ui/sections/form-block";
import { useActionState } from "react";
import { IDLE_FORM } from "../../lib/actions/form-state";
import { shown, type Island } from "./form-island-state";

/** A `formBlock` (D81) that keeps the forms' server action's answer (`form-island-state.ts`). */
export function FormBlockIsland({
  submit,
  formId,
  permalink,
  ...section
}: Island & Omit<FormBlockSectionProps, "action" | "status" | "errors" | "values" | "formId">) {
  const [state, action, pending] = useActionState(submit, IDLE_FORM, permalink ?? `#${formId}`);
  return (
    <FormBlockSection {...section} {...shown(state, pending)} formId={formId} action={action} />
  );
}
