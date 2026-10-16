"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A link of the navigation tree; the page it points at is marked with `aria-current`. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href={href as Route}
      prefetch={false}
      aria-current={pathname === href ? "page" : undefined}
      className="hover:bg-accent focus-visible:ring-ring aria-[current=page]:bg-accent flex min-h-11 items-center rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:outline-none aria-[current=page]:font-medium"
    >
      {children}
    </Link>
  );
}
