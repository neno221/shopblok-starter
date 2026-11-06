"use client";

import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

/** Payload's listener: a save in the admin re-renders the page on the server with the new draft. */
export default function LivePreviewListener({ serverURL }: { serverURL: string }) {
  const router = useRouter();
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}

// The marker `scripts/first-load.ts` finds this module's chunk by (D102): no route may load it at
// first, since `refresh-on-save.tsx` loads it with `next/dynamic`.
LivePreviewListener.displayName = "shopblok:live-preview-listener";
