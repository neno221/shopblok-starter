import { radius } from "@shopblok/ui/tokens";
import { radiusClasses } from "./classes";

/** One `--radius` and the scale derived from it (D27). */
export function Radius() {
  return (
    <div>
      <p className="text-muted-foreground text-sm">
        <code>--radius</code> is {radius.base} px; each step is that plus an offset.
      </p>
      <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-4">
        {radius.steps.map((step) => (
          <li key={step.step}>
            <span
              aria-hidden="true"
              className={`bg-muted block h-20 border-2 border-foreground ${radiusClasses[step.step]}`}
            />
            <p className="mt-2 text-sm">
              <code>{radiusClasses[step.step]}</code>
            </p>
            <p className="text-muted-foreground text-xs">
              {step.px} px ({step.offset >= 0 ? "+" : "−"}
              {Math.abs(step.offset)} from <code>--radius</code>)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
