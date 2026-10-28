"use client";

import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

/**
 * Live preview's island (D74): when the editor saves (or autosaves) in Payload's admin, the page in
 * the preview frame re-renders on the server with the new draft. A page renders it only in Draft
 * Mode, so a published page's JavaScript never includes it.
 */
export function RefreshOnSave({ serverURL }: { serverURL: string }) {
  const router = useRouter();
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}
