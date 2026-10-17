// A client component: the design system's toast demo, the live render of `molecules/toast`. A toast
// is shown from the browser (`showToast` calls the shared manager that the `Toaster` in `Providers`
// draws), so the buttons that show them need a click handler, which a story, rendered on the
// server, cannot hand over. One button for each kind, each `data-slot="toast-trigger"` (the
// interaction check presses the first). The demo keeps its toasts until they are closed
// (`timeout: 0`): a page that is checked with axe, focus and a live region must not race a timer,
// and a reader trying the demo has no need of one either.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { ToastMessage } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { showToast } from "@shopblok/ui/molecules/toast";
import { toast } from "@shopblok/ui/primitives/toast";

export type ToastDemoSample = {
  /** The words of the button that shows the toast. */
  trigger: string;
  message: ToastMessage;
};

export function ToastDemo({
  samples,
  copy,
}: {
  samples: ToastDemoSample[];
  copy: Messages["molecules"]["toast"];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {samples.map((sample) => (
        <Button
          key={sample.message.kind}
          type="button"
          variant="outline"
          data-slot="toast-trigger"
          data-kind={sample.message.kind}
          onClick={() => showToast(toast, sample.message, copy, { timeout: 0 })}
        >
          {sample.trigger}
        </Button>
      ))}
    </div>
  );
}
