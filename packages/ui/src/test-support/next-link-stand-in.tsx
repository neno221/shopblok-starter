// Ours (T35, SETUP.md "Navigation and headers (T35)"). A stand-in for `next/link` in the headers'
// tests: a plain anchor that writes the `prefetch` it was given into `data-prefetch`, so a test can
// read what every link of a header was drawn with. `vi.mock` is hoisted above the imports, so a test
// file asks for it with a dynamic import:
// `vi.mock("next/link", async () => (await import("../../test-support/next-link-stand-in")).nextLinkStandIn())`.
// This module imports React and nothing of ours, so that import cannot loop back into the mock.
import type * as React from "react";

type LinkProps = React.ComponentProps<"a"> & { prefetch?: boolean | null };

export function nextLinkStandIn() {
  return {
    default: ({ href, prefetch, children, ...rest }: LinkProps) => (
      <a href={String(href)} data-prefetch={String(prefetch)} {...rest}>
        {children}
      </a>
    ),
  };
}
