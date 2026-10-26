// D66 (T48): what the market's error boundary needs from the shell and cannot read itself. `error.tsx`
// is a client component (Next's rule), so it reads no root param and no market map; the layout puts
// the market's home here, as the server works it out, and the boundary links to it.
"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ShellLinks = {
  /** The market's home, its public URL. */
  home: string;
};

const ShellLinksContext = createContext<ShellLinks>({ home: "/" });

export function ShellLinksProvider({
  value,
  children,
}: {
  value: ShellLinks;
  children: ReactNode;
}) {
  return <ShellLinksContext value={value}>{children}</ShellLinksContext>;
}

/** The shell's links; outside the provider, the site's root. */
export function useShellLinks(): ShellLinks {
  return useContext(ShellLinksContext);
}
