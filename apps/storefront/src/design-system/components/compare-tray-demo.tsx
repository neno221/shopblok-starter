"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { CompareTray, type CompareTrayProps } from "@shopblok/ui/organisms/compare-tray";
import { useState } from "react";

type CompareTrayDemoProps = Omit<CompareTrayProps, "items" | "onRemove" | "onClear"> & {
  /** The products the tray starts with, and the ones the reset button puts back. */
  chosen: CompareTrayProps["items"];
  /** The reset button's words (the design system's, in English). */
  resetLabel: string;
  /** One line about the page behind the tray (the design system's, in English). */
  note: string;
};

/**
 * Ours (T37, SETUP.md "Listing organisms (T37)"). The compare tray with its products in state, for
 * the DS page, as a shop's page will have them once M5's island reads them from the visitor store:
 * the tray's remove buttons and "Remove all" work, and the tray goes when the last product does. A
 * server component cannot hand the tray a function, so the handlers are made here, on the client;
 * the props that reach this component are plain data.
 *
 * The tray is the first thing in the box, as it is the last thing in a shop's page, and the "page"
 * is the button after it: "Choose them again" brings the products back (a visitor on the DS page
 * who has removed them all would otherwise have nothing left to try), and it is also the control
 * that follows the tray, so it is where focus goes when the last product is removed, as the next
 * Tab would have gone. The words around it are English, the design system's own, and say so.
 */
export function CompareTrayDemo({ chosen, resetLabel, note, ...tray }: CompareTrayDemoProps) {
  const [items, setItems] = useState(chosen);
  return (
    <>
      <CompareTray
        {...tray}
        items={items}
        onRemove={(id) => setItems((list) => list.filter((item) => item.id !== id))}
        onClear={() => setItems([])}
      />
      <div lang="en" className="flex flex-col items-start gap-3 p-4">
        <p className="text-muted-foreground max-w-prose text-sm">{note}</p>
        <Button type="button" variant="outline" onClick={() => setItems(chosen)}>
          {resetLabel}
        </Button>
      </div>
    </>
  );
}
