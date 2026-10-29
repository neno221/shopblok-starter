import {
  FORM_FIELD_NAME,
  FORM_LIMITS,
  FormField,
  type FormField as FormFieldView,
} from "@shopblok/registry/contracts";
import { z } from "zod";
import { text } from "../text";

// D81's forms, between Payload's form builder and the shop: the fields an editor built, as the
// `formBlock` section draws them, and the zod schema the server action checks the answers with.
// Pure, so the resolver, the action, the admin's checks and their tests share one reading.

/**
 * The spam trap (D81): a text field no person sees or reaches (`FormHoneypot`), posted with every
 * form. Whatever fills it is a bot, which is told "thank you" and stored nowhere. No field an editor
 * builds may take its name.
 */
export const HONEYPOT_FIELD = "website";

/** A field of a form as Payload stores it (the plugin's blocks), read at any depth. */
export type StoredFormField = {
  id?: string | null;
  blockType: string;
  name?: string | null;
  label?: string | null;
  required?: boolean | null;
  width?: number | null;
  defaultValue?: string | boolean | null;
  placeholder?: string | null;
  options?: { label?: string | null; value?: string | null }[] | null;
  message?: unknown;
};

/** The plugin's width is a percentage: half or less shares a row (the section's two columns). */
const widthOf = (width: number | null | undefined): "half" | "full" =>
  typeof width === "number" && width > 0 && width <= 50 ? "half" : "full";

/** One stored field as the section's field, or `undefined` when it cannot be drawn. */
function fieldView(field: StoredFormField, index: number): FormFieldView | undefined {
  if (field.blockType === "message")
    return field.message == null
      ? undefined
      : { kind: "message", id: field.id ?? `message-${index}` };
  const name = field.name ?? "";
  const base = {
    name,
    label: text(field.label) ?? name,
    required: field.required === true,
    width: widthOf(field.width),
  };
  const defaultValue =
    typeof field.defaultValue === "string" ? text(field.defaultValue) : undefined;
  const candidate = (() => {
    switch (field.blockType) {
      case "text":
      case "textarea":
        return { kind: field.blockType, ...base, defaultValue };
      case "email":
        return { kind: "email", ...base };
      case "select":
        return {
          kind: "select",
          ...base,
          options: (field.options ?? []).flatMap((option) => {
            // Trimmed, as a posted answer is (`posted`), so the value drawn is the value accepted.
            const value = text(option.value)?.trim();
            return value === undefined ? [] : [{ label: text(option.label) ?? value, value }];
          }),
          defaultValue: defaultValue?.trim(),
          placeholder: text(field.placeholder),
        };
      case "checkbox":
        return { kind: "checkbox", ...base, defaultChecked: field.defaultValue === true };
      default:
        return undefined;
    }
  })();
  const parsed = FormField.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

/**
 * A form's fields as the section draws them: each that can be drawn, in the editor's order. A field
 * with a name that is not a field name, or the spam trap's, is left out (the admin refuses both on
 * save, `checkFields`), and so is a second field of one name.
 */
export function formFields(fields: readonly StoredFormField[] | null | undefined): FormFieldView[] {
  const seen = new Set<string>([HONEYPOT_FIELD]);
  return (fields ?? []).flatMap((stored, index): FormFieldView[] => {
    const field = fieldView(stored, index);
    if (field === undefined) return [];
    if (field.kind === "message") return [field];
    if (seen.has(field.name)) return [];
    seen.add(field.name);
    return [field];
  });
}

/** The most a text or text area's answer may hold (D81), which its default may not pass. */
const DEFAULT_LIMITS: Partial<Record<string, number>> = {
  text: FORM_LIMITS.text,
  textarea: FORM_LIMITS.textarea,
};

/**
 * Why a form's fields cannot be saved, or `true` (the admin's check on the plugin's `fields`): each
 * a field name (letters, digits, `-` and `_`, from a letter), none the spam trap's, each once, and
 * no default longer than the answer the server takes, which would refuse every post that keeps it.
 */
export function checkFields(fields: readonly StoredFormField[] | null | undefined): string | true {
  const seen = new Set<string>();
  for (const field of fields ?? []) {
    if (field.blockType === "message") continue;
    const name = field.name ?? "";
    if (!FORM_FIELD_NAME.test(name))
      return `“${name}” cannot be a field's name: use up to 40 letters, digits, - and _, starting with a letter.`;
    if (name === HONEYPOT_FIELD)
      return `“${HONEYPOT_FIELD}” is the spam trap's name: give this field another.`;
    if (seen.has(name)) return `Each field needs a name of its own: “${name}” is used twice.`;
    seen.add(name);
    const limit = DEFAULT_LIMITS[field.blockType];
    if (
      limit !== undefined &&
      typeof field.defaultValue === "string" &&
      field.defaultValue.trim().length > limit
    )
      return `The default of “${name}” is longer than a visitor may send: keep it to ${limit} characters.`;
  }
  return true;
}

/**
 * A posted text: its line breaks as `\n`, trimmed, and empty as missing, so an optional field may
 * be left blank. A text area posts each line break as CRLF, but the browser's `maxLength` counts
 * it once: counted as posted, a message the browser allowed could be refused for its length.
 */
const posted = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.replace(/\r\n?/g, "\n").trim();
  return trimmed === "" ? undefined : trimmed;
};

/** One field's answer, by its kind, required or not (D81's size limits). */
function answerSchema(field: Exclude<FormFieldView, { kind: "message" }>): z.ZodType {
  const answer = (() => {
    switch (field.kind) {
      case "text":
        return z.string().max(FORM_LIMITS.text);
      case "textarea":
        return z.string().max(FORM_LIMITS.textarea);
      case "email":
        return z.email().max(FORM_LIMITS.email);
      // A string first, so a choice or a box left empty is `required`, not `invalid` (`toFieldErrors`).
      case "select":
        return z
          .string()
          .pipe(z.enum(field.options.map((option) => option.value) as [string, ...string[]]));
      case "checkbox":
        // A ticked box posts its value, `on`; an unticked one posts nothing.
        return z.string().pipe(z.literal("on"));
    }
  })();
  return z.preprocess(posted, field.required ? answer : answer.optional());
}

/**
 * The answers' schema (D81): one key per field, each by its kind and the form's `required`, and
 * nothing else: the spam trap, Next's own fields and anything a client adds are dropped.
 */
export function answersSchema(fields: readonly FormFieldView[]) {
  return z.object(
    Object.fromEntries(
      fields.flatMap((field) =>
        field.kind === "message" ? [] : [[field.name, answerSchema(field)]],
      ),
    ),
  );
}

/** The parsed answers as the plugin's `submissionData`: every field, a box as `true` or `false`. */
export function submissionData(
  fields: readonly FormFieldView[],
  answers: Record<string, unknown>,
): { field: string; value: string }[] {
  return fields.flatMap((field) => {
    if (field.kind === "message") return [];
    const answer = answers[field.name];
    const value =
      field.kind === "checkbox"
        ? String(answer === "on")
        : typeof answer === "string"
          ? answer
          : "";
    return [{ field: field.name, value }];
  });
}

/** The newsletter's field: a form whose only field to fill in is one email field (D81). */
export function newsletterField(fields: readonly FormFieldView[]): string | undefined {
  const inputs = fields.filter((field) => field.kind !== "message");
  const [only] = inputs;
  return inputs.length === 1 && only?.kind === "email" ? only.name : undefined;
}
