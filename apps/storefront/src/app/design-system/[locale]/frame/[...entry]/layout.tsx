import type { ReactNode } from "react";
import { entryParams } from "../../../../../design-system/catalog";
import { Document } from "../../../../../design-system/components/document";
import { requireDesignSystemEntry, staticParams } from "../../../../../design-system/gate";
import { designSystemMetadata } from "../../../../../design-system/metadata";
import "../../../../../styles/globals.css";

export const metadata = designSystemMetadata;

// The root layout of the frames: `<html>` and `<body>` and nothing else, so what the viewport
// switcher's iframes load (and D34's checks open) is the entry alone.
export function generateStaticParams() {
  return staticParams(entryParams());
}

export default async function FrameRootLayout({ children }: { children: ReactNode }) {
  const { locale } = await requireDesignSystemEntry();
  return <Document locale={locale}>{children}</Document>;
}
