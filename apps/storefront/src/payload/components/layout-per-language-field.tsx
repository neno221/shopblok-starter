"use client";

import {
  CheckboxField,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormFields,
} from "@payloadcms/ui";
import type { CheckboxFieldClientComponent } from "payload";
import { useEffect, useRef } from "react";

/**
 * The page's "Own layout per language" switch (D105). Switching it on copies the shared blocks into
 * the language's own layout on the server (`copyLayoutOnSwitch`), but Payload's autosave keeps the
 * form's own values and leaves out rows the server added, so "Layout (this language)" stayed empty
 * until a reload (W7 review item 2). Once the save that switched it on is done (the autosave merges
 * its own state into the form last, so not before), this puts the copied blocks into the form,
 * keeping everything else as the editor has it.
 */
export const LayoutPerLanguageField: CheckboxFieldClientComponent = (props) => {
  const { data: saved } = useDocumentInfo();
  const { getData, reset } = useForm();
  const saving = useFormBackgroundProcessing();
  const switchedOn = useFormFields(([fields]) => fields["layoutPerLanguage"]?.value === true);
  const ownRows = useFormFields(([fields]) => Number(fields["localizedLayout"]?.value ?? 0));
  /** The editor switched it on in this form, and the copy is not in the form yet. */
  const waiting = useRef(false);
  const wasOn = useRef(switchedOn);

  useEffect(() => {
    if (switchedOn && !wasOn.current) waiting.current = true;
    if (!switchedOn) waiting.current = false;
    wasOn.current = switchedOn;
  }, [switchedOn]);

  useEffect(() => {
    if (!waiting.current || saving || !switchedOn || ownRows > 0) return;
    if (saved?.["layoutPerLanguage"] !== true) return;
    const copied = saved["localizedLayout"];
    if (!Array.isArray(copied) || copied.length === 0) return;
    waiting.current = false;
    void reset({ ...getData(), localizedLayout: copied });
  }, [saved, saving, switchedOn, ownRows, getData, reset]);

  return <CheckboxField {...props} />;
};
