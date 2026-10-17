import type { Metadata } from "next";
import { findEntry } from "../../../../../design-system/catalog";
import { LiveRender } from "../../../../../design-system/components/entry-body";
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
  return { title: entry === undefined ? "Not found" : `${entry.label} · preview` };
}

// `/design-system/[locale]/preview/{id}` (D52): the live render alone, with no states, no headings
// and no chrome. T40 captures the `en` previews of the family entries at 1200 × 800 as their
// thumbnails (`/registry/{id}.png`) and their baselines.
export default async function PreviewRoute() {
  const { locale, entry } = await requireDesignSystemEntry();
  return (
    <main className="p-6">
      <LiveRender entry={entry} ctx={createContext(locale)} />
    </main>
  );
}
