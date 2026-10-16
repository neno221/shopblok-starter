import { shadows } from "@shopblok/ui/tokens";
import { shadowClasses } from "./classes";

/** The kit's effect styles. */
export function Shadows() {
  return (
    <div>
      <p className="text-muted-foreground text-sm">
        The kit&apos;s effect styles. <code>shadow-sm</code> has one layer where Tailwind&apos;s has
        two.
      </p>
      <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-6">
        {shadows.map((shadow) => (
          <li key={shadow.name}>
            <span
              aria-hidden="true"
              className={`bg-card block h-20 rounded-lg ${shadowClasses[shadow.name]}`}
            />
            <p className="mt-2 text-sm">
              <code>{shadowClasses[shadow.name]}</code>
            </p>
            <p className="text-muted-foreground text-xs break-words">{shadow.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
