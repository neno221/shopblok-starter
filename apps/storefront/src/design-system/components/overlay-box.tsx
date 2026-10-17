"use client";

import { catalogs, formatMessage } from "@shopblok/i18n";
import { PortalContainerProvider } from "@shopblok/ui/primitives/portal-container";
import { useState, type ReactNode } from "react";

const copy = catalogs.en.designSystem;

/**
 * D45: an overlay (a drawer, dialog, sheet, popover, menu or toast) drawn open on a DS frame. The
 * box has a fixed height and is a containing block for `position: fixed` (`[contain:paint]`, which
 * also clips what would spill out), and the overlays' portals render into it
 * (`PortalContainerProvider`), so a sheet pinned to the viewport's edge is pinned to the box's, a
 * popover is placed against its trigger inside it, and several open states fit on one frame. The
 * overlay itself is given `modal={false}` and opened by its story (`defaultOpen`): a modal would
 * make the rest of the frame inert, and two could not be open at once. A client component: the
 * portals need the box's element, held in state (a ref is still empty when an overlay inside it
 * opens on first render).
 */
export function OverlayBox({
  name,
  height = 480,
  children,
}: {
  /** What is drawn open, for the box's label (`Sheet, drawn open`). */
  name: string;
  /** The box's height in CSS px; the overlay's own size is the component's. */
  height?: number;
  children: ReactNode;
}) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setBox}
      role="group"
      aria-label={formatMessage(copy.overlayBox, { name }, "en")}
      data-overlay-box=""
      className="relative w-full overflow-hidden rounded-lg border border-dashed bg-muted [contain:paint]"
      style={{ blockSize: `${height}px` }}
    >
      <PortalContainerProvider container={box}>{children}</PortalContainerProvider>
    </div>
  );
}
