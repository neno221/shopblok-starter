"use client";

import {
  CheckboxField,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormFields,
  useLocale,
  useOperation,
  useServerFunctions,
} from "@payloadcms/ui";
import type { CheckboxFieldClientComponent, FormState } from "payload";
import { useEffect, useRef } from "react";

const FIELD = "localizedLayout";
/** The form state's paths of the language's own layout: the field and its rows' fields. */
const isOwn = (path: string) => path === FIELD || path.startsWith(`${FIELD}.`);

/**
 * The page's "Own layout per language" switch (D105). Switching it on copies the shared blocks into
 * the language's own layout on the server (`copyLayoutOnSwitch`), but Payload's autosave keeps the
 * form's own values and leaves out rows the server added, so "Layout (this language)" stayed empty
 * until a reload (W7 review item 2). After the first save that follows the switch going on (once it
 * is done: the autosave merges its own state into the form last), this puts the copied blocks into
 * the form when it has none of its own. It replaces only that field's state, and leaves the form's
 * other fields and its "modified" flag as they are then, so nothing typed meanwhile is lost (W7
 * fixes' review, item 3).
 */
export const LayoutPerLanguageField: CheckboxFieldClientComponent = (props) => {
  const { id, collectionSlug, data: saved, docPermissions, getDocPreferences } = useDocumentInfo();
  const { dispatchFields, getData, getFields } = useForm();
  const { getFormState } = useServerFunctions();
  const { code: locale } = useLocale();
  const operation = useOperation();
  const saving = useFormBackgroundProcessing();
  const switchedOn = useFormFields(([fields]) => fields["layoutPerLanguage"]?.value === true);
  const ownRows = useFormFields(([fields]) => Number(fields[FIELD]?.value ?? 0));
  /** The editor switched it on in this form, and no save of that has come back yet. */
  const waiting = useRef(false);
  const wasOn = useRef(switchedOn);
  /** A save ran since the last look. */
  const sawSave = useRef(false);

  useEffect(() => {
    if (switchedOn && !wasOn.current) waiting.current = true;
    if (!switchedOn) waiting.current = false;
    wasOn.current = switchedOn;
  }, [switchedOn]);

  useEffect(() => {
    if (saving) {
      sawSave.current = true;
      return;
    }
    if (!waiting.current || !sawSave.current) return;
    sawSave.current = false;
    // A save that started before the switch went on: wait for the next one.
    if (saved?.["layoutPerLanguage"] !== true) return;
    // This save is the one: whatever it brought, the wait ends here, so blocks the editor deletes
    // later never come back (W7 fixes' review, item 2).
    waiting.current = false;
    const copied = saved[FIELD];
    if (ownRows > 0 || !Array.isArray(copied) || copied.length === 0 || !collectionSlug) return;
    void (async () => {
      const { state } = await getFormState({
        id,
        collectionSlug,
        data: { ...getData(), [FIELD]: copied },
        docPermissions,
        docPreferences: await getDocPreferences(),
        locale,
        operation,
        renderAllFields: true,
        schemaPath: collectionSlug,
        skipValidation: true,
      });
      if (!state) return;
      // The form as it is now, with only the language's own layout taken from the answer.
      const now = getFields();
      if (Number(now[FIELD]?.value ?? 0) > 0) return;
      const next: FormState = {};
      for (const [path, field] of Object.entries(now)) if (!isOwn(path)) next[path] = field;
      for (const [path, field] of Object.entries(state)) if (isOwn(path)) next[path] = field;
      dispatchFields({ type: "REPLACE_STATE", state: next });
    })();
  }, [
    saving,
    saved,
    ownRows,
    id,
    collectionSlug,
    docPermissions,
    getDocPreferences,
    getData,
    getFields,
    getFormState,
    dispatchFields,
    locale,
    operation,
  ]);

  return <CheckboxField {...props} />;
};
