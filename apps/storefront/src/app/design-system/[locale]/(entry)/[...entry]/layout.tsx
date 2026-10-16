import type { ReactNode } from "react";
import { entryParams } from "../../../../../design-system/catalog";
import { Document } from "../../../../../design-system/components/document";
import { Shell } from "../../../../../design-system/components/shell";
import { requireDesignSystemEntry, staticParams } from "../../../../../design-system/gate";
import { designSystemMetadata } from "../../../../../design-system/metadata";
import "../../../../../styles/globals.css";

export const metadata = designSystemMetadata;

// The root layout of the entry pages: `locale` and `entry` are its root params, so an unknown entry
// ends in `notFound()` before anything streams and answers a real 404 (see `requireDesignSystemEntry`).
// Every entry in every locale is listed: manifest × the four locales.
export function generateStaticParams() {
  return staticParams(entryParams());
}

export default async function EntryRootLayout({ children }: { children: ReactNode }) {
  const { locale } = await requireDesignSystemEntry();
  return (
    <Document locale={locale}>
      <Shell locale={locale}>{children}</Shell>
    </Document>
  );
}
