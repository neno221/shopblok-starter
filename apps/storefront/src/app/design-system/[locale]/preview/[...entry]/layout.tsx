import type { ReactNode } from "react";
import { entryParams } from "../../../../../design-system/catalog";
import { Document } from "../../../../../design-system/components/document";
import { requireDesignSystemEntry, staticParams } from "../../../../../design-system/gate";
import { designSystemMetadata } from "../../../../../design-system/metadata";
import "../../../../../styles/globals.css";

export const metadata = designSystemMetadata;

// The root layout of the previews (D52), as the frames': `<html>` and `<body>`, the gate, and
// `noindex` from the metadata. Every entry in every locale, as the pages and the frames.
export function generateStaticParams() {
  return staticParams(entryParams());
}

export default async function PreviewRootLayout({ children }: { children: ReactNode }) {
  const { locale } = await requireDesignSystemEntry();
  return <Document locale={locale}>{children}</Document>;
}
