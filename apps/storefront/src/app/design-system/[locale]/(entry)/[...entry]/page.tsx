import type { Metadata } from "next";
import { findEntry } from "../../../../../design-system/catalog";
import { EntryPage } from "../../../../../design-system/components/entry-page";
import { createContext } from "../../../../../design-system/context";
import { requireDesignSystemEntry } from "../../../../../design-system/gate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entry: string[] }>;
}): Promise<Metadata> {
  const entry = findEntry((await params).entry);
  return { title: entry === undefined ? "Not found" : `${entry.label} · Design system` };
}

// The layout has already ended the render for an unknown entry; the page asks again, so it stays
// a 404 if someone moves it under another layout.
export default async function EntryRoute() {
  const { locale, entry } = await requireDesignSystemEntry();
  return <EntryPage entry={entry} ctx={createContext(locale)} />;
}
