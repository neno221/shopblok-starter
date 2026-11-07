"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { QuickViewIslandProps } from "./quick-view-island";

// D101, D102 (T83): what opens the quick view from a listing's card. The card's button is a GET
// form to the product's page (`QuickViewTrigger`, `data-quick-view` naming the product): this
// catches its `submit`, and only then loads the dialog's island (`import()`, so its code and the
// three members are no route's first load) and opens it on that product, the member the button
// names. If the island's code does not load (a deploy took the old build's files away, the visitor
// went offline), the form goes where it would without scripts: the product's page. Kept as small as
// it is because it is in the listings' first load (0.5 KB were left at T84).

type Opened = Omit<QuickViewIslandProps, "market"> & {
  Island: ComponentType<QuickViewIslandProps>;
};

export function QuickViewOpener({ market }: { market: string }) {
  const [opened, setOpened] = useState<Opened | null>(null);
  useEffect(() => {
    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const handle = form.dataset["quickView"];
      if (handle === undefined || event.defaultPrevented) return;
      event.preventDefault();
      const button = event.submitter ?? form.querySelector("button");
      import("./quick-view-island").then(
        ({ QuickViewIsland }) =>
          setOpened((last) => ({
            Island: QuickViewIsland,
            handle,
            href: form.action,
            variant: button?.dataset["variant"],
            from: button,
            press: (last?.press ?? 0) + 1,
          })),
        () => window.location.assign(form.action),
      );
    }
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);
  if (opened === null) return null;
  const { Island, ...props } = opened;
  return <Island key={props.handle} {...props} market={market} />;
}
