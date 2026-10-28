"use client";

import dynamic from "next/dynamic";

// Loaded on demand: a page segment ships every client component it imports as an entry script,
// rendered or not, so a direct import would put Payload's live-preview code on every published
// page. Only this loader is an entry; the listener's chunk is fetched when it renders.
const LivePreviewListener = dynamic(() => import("./live-preview-listener"), { ssr: false });

/**
 * Live preview's island (D74): when the editor saves (or autosaves) in Payload's admin, the page in
 * the preview frame re-renders on the server with the new draft. A page renders it only in Draft
 * Mode, so a published page never loads the listener (`cms-preview.spec.ts` checks the scripts).
 */
export function RefreshOnSave({ serverURL }: { serverURL: string }) {
  return <LivePreviewListener serverURL={serverURL} />;
}
