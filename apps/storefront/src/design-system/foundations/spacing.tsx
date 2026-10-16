import { SPACING_STEP_PX, spacingSteps } from "./classes";

/** Tailwind's 4 px step (D27): a step `n` is `n × --spacing`. */
export function Spacing() {
  return (
    <div>
      <p className="text-muted-foreground text-sm">
        One step is <code>--spacing</code>, {SPACING_STEP_PX} px; every utility (<code>p-4</code>,{" "}
        <code>gap-2</code>, <code>w-11</code>) takes a multiple of it.
      </p>
      <ul className="mt-4">
        {spacingSteps.map((step) => (
          <li key={step.step} className="flex items-center gap-4 border-t py-2">
            <p className="text-muted-foreground w-40 shrink-0 text-sm">
              <code>{step.className}</code>
              <br />
              {step.multiple} × {SPACING_STEP_PX} = {step.multiple * SPACING_STEP_PX} px
            </p>
            <span aria-hidden="true" className={`block h-4 bg-primary ${step.className}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
