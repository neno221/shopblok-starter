import type { Metadata } from "next";
import { findEntry } from "../../../../../design-system/catalog";
import { EntryBody } from "../../../../../design-system/components/entry-body";
import { createContext } from "../../../../../design-system/context";
import { requireDesignSystemEntry } from "../../../../../design-system/gate";

// D44: a build fails if anything on this page reads the request (ADR 0004).
export const ensureStatic = "navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entry: string[] }>;
}): Promise<Metadata> {
  const entry = findEntry((await params).entry);
  return { title: entry === undefined ? "Not found" : `${entry.label} · frame` };
}

// The bare render: no navigation, no header, nothing but the entry (live render and states). The
// viewport switcher loads this in an iframe, and D34's checks (T24) open it directly.
export default async function FrameRoute() {
  const { locale, entry } = await requireDesignSystemEntry();
  return (
    <main className="p-4">
      <EntryBody entry={entry} ctx={createContext(locale)} />
    </main>
  );
}
