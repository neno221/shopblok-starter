import type { FormState } from "../../lib/actions/form-state";

// D81's islands: each draws a form with `useActionState` around the forms' server action
// (`submitForm`, bound to the market and the form by the page), so the section shows the answer:
// sending, each refused field with what was typed, the confirmation. Without scripts the form posts
// to the permalink, by default the page's own URL with the form's `#id`; Next runs the action and
// draws that page again with its answer, and the browser scrolls to the form. Next 16.4.3 draws the
// answer only on a page prerendered whole (home, the catalog, a product, a CMS page): a page with a
// per-visitor part (the cart, the account, sign-in) is resumed from its prerendered shell, and
// React's resume takes no action state, so there the page comes back without it. The footer's
// newsletter, on every page, therefore posts to the market's home (`permalink`). One island per
// module, so a page ships only the forms it draws (the footer's newsletter is on every page).

export type Submit = (previous: FormState, data: FormData) => Promise<FormState>;

export type Island = {
  submit: Submit;
  formId: string;
  /** Where a post without scripts goes and is answered; the form's `#id` on this page by default. */
  permalink?: string;
};

/** The section's props for a state: what to mark, what to type back. */
export function shown(state: FormState, pending: boolean) {
  if (pending) return { status: "sending" as const };
  if (state.status !== "error") return { status: state.status };
  return { status: "error" as const, errors: state.errors, values: state.values };
}

/** What the address field shows: what was typed after a refusal, else empty. */
export function typedEmail(state: FormState, fieldName: string | undefined): string {
  return state.status === "error" ? (state.values[fieldName ?? "email"] ?? "") : "";
}
