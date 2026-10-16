import type { ReactNode } from "react";

/**
 * A titled block of a DS page. `id` links the heading to the region for screen readers. The
 * heading is the shell's English chrome, so it says so (`lang`) inside a page in another locale.
 */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <h2 id={id} lang="en" className="text-xl font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
