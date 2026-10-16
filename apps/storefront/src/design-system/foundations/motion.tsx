import { CssValue } from "../components/css-value";
import { durations } from "./classes";

/** The three durations and the easing. The values are read from the stylesheet in the browser. */
export function Motion() {
  return (
    <div>
      <p className="text-muted-foreground text-sm">
        Hover or focus a bar to move it. Under <code>prefers-reduced-motion: reduce</code> nothing
        moves. The easing is <code>ease-standard</code> (<code>--ease-standard</code>).
      </p>
      <ul className="mt-4">
        {durations.map((duration) => (
          <li key={duration.name} className="border-t py-3">
            <p className="text-sm">
              <code>{duration.variable}</code>: <CssValue name={duration.variable} />
            </p>
            <div className="bg-muted mt-2 max-w-md rounded-md p-1">
              <button
                type="button"
                className={`bg-primary text-primary-foreground block min-h-11 w-1/4 rounded-sm text-sm ease-standard motion-safe:transition-[width] motion-safe:hover:w-full motion-safe:focus-visible:w-full ${duration.className}`}
              >
                {duration.name}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
