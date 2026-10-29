import type { Metadata } from "next";
import { JournalView, journalMetadata } from "../../../../../../components/journal/journal-view";
import { pathPage } from "../../../../../../lib/listing/query";

// D80, D59 (T66): the journal's other pages, by path (`/journal/page/2`), rendered at their first
// visit and kept in the static shell; `/journal/page/1` and a page past the last are 404s.
export const ensureStatic = "navigation";
// W5: no instant-navigation check for a page that reads its path first (SETUP.md, "W5 fixes").
export const instant = false;

type Props = { params: Promise<{ market: string; n: string }> };

/** Cache Components refuse an empty list: `1`, a 404, stands for the pages rendered on demand. */
export async function generateStaticParams(): Promise<{ n: string }[]> {
  return [{ n: "1" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return journalMetadata(pathPage((await params).n));
}

export default async function JournalPagedPage({ params }: Props) {
  return <JournalView page={pathPage((await params).n)} />;
}
