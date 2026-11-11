"use client";

import { ConfigProvider, PublishButton, useConfig } from "@payloadcms/ui";
import { useMemo } from "react";

/**
 * Payload's own Publish button, without its "Publish in <language>" and the schedule drawer's
 * language choice (W7 review item 17). Payload offers both on any document with localized fields,
 * whether or not D106's per-language publishing is on, and D106 is off: a one-language publish
 * merges the shared blocks by their place (T88's check 1) and copies the layout per language
 * published in every language. Payload decides from the config's `localization`, so the button
 * reads a config without it; the button publishes every language at once, in the language being
 * edited, as it does without that choice.
 */
export function PublishAllButton(props: { label?: string }) {
  const { config } = useConfig();
  const withoutChoice = useMemo(() => ({ ...config, localization: false as const }), [config]);
  return (
    <ConfigProvider config={withoutChoice}>
      <PublishButton {...props} />
    </ConfigProvider>
  );
}
