// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; D99). What the FAQ's members
// share, moved out of `standard.tsx` (T63) with the same classes, so the first member's pixels are
// unchanged: the props and the questions as native disclosures. A server component.
import type { FaqSection as FaqSectionData } from "@shopblok/registry/contracts";
import { ChevronDownIcon } from "lucide-react";

type FaqSectionProps = FaqSectionData & {
  /** The questions open at first (their `value`s); none by default. */
  defaultOpen?: readonly string[];
  className?: string;
};

/** The questions, each a `<details>` whose 44 px summary opens its answer. */
function FaqItems({ items, defaultOpen = [] }: Pick<FaqSectionProps, "items" | "defaultOpen">) {
  return (
    <div className="flex flex-col border-t">
      {items.map((item) => (
        <details
          key={item.value}
          data-slot="faq-item"
          open={defaultOpen.includes(item.value)}
          className="group/faq border-b"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-2 rounded-md py-4 text-start font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 wrap-anywhere">{item.title}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open/faq:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="flex flex-col gap-4 pb-4">
            {item.answer.map((paragraph, index) => (
              <p key={index} className="wrap-anywhere">
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export { FaqItems };
export type { FaqSectionProps };
