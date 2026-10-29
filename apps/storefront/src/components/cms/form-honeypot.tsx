import { HONEYPOT_FIELD } from "../../lib/forms/fields";

/**
 * The spam trap every form posts (D81): a text field inside a `hidden` box, so no person sees it,
 * reaches it by Tab or hears it, and a browser does not fill it in (`autocomplete="off"`). A bot
 * that fills every field it finds fills this one too, and the server action answers it with
 * success and stores nothing.
 */
export function FormHoneypot({ label }: { label: string }) {
  return (
    <div hidden data-slot="form-honeypot">
      <label>
        {label}
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
