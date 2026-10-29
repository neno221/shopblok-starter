// Ours (T63, SETUP.md "Blocks (T63)"). The look of an editor's rich text, which arrives as plain
// elements (Payload's Lexical converter on the storefront, a story's sample in the DS): headings,
// paragraphs, lists, quotes, links, rules and pictures, spaced on the tokens. Links sit in running
// text, so D32's 44 px does not apply (WCAG 2.5.8's inline exception), and they keep the link atom's
// underline and focus ring. A server component.
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const prose = [
  "max-w-prose min-w-0 text-base leading-7 wrap-anywhere",
  "[&>:first-child]:mt-0",
  "[&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-balance",
  "[&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold",
  "[&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold",
  "[&_p]:mt-4",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:mt-1",
  "[&_blockquote]:mt-6 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:italic",
  "[&_a]:rounded-xs [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:outline-none [&_a]:hover:decoration-2 [&_a]:focus-visible:ring-3 [&_a]:focus-visible:ring-ring",
  "[&_hr]:my-8 [&_hr]:border-border",
  "[&_img]:mt-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
  "[&_strong]:font-semibold",
].join(" ");

type ProseProps = React.ComponentProps<"div">;

function Prose({ className, ...props }: ProseProps) {
  return <div data-slot="prose" className={cn(prose, className)} {...props} />;
}

export { Prose };
export type { ProseProps };
