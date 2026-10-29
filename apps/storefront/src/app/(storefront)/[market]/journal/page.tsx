import type { Metadata } from "next";
import { JournalView, journalMetadata } from "../../../../components/journal/journal-view";

// D80 (T66): the journal's first page, newest posts first, in the static shell (`journal-view.tsx`).
export const ensureStatic = "navigation";

export async function generateMetadata(): Promise<Metadata> {
  return journalMetadata(1);
}

export default function JournalPage() {
  return <JournalView page={1} />;
}
