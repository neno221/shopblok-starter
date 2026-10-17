// Ours (T31, D45): where the overlay primitives portal their popups. Unset, Base UI portals into
// `<body>`, as on a shop's page; the design-system page sets it to a box of fixed height, so an
// overlay drawn open stays inside its frame and several open states fit on one page. Every
// primitive that renders a Base UI `Portal` passes `usePortalContainer()` as its `container`, so a
// molecule or an organism drawn inside the box needs no prop for it. The value is the box's element,
// held in state (`ref={setBox}`), not a ref: an overlay drawn open inside the box resolves its portal
// before React has set a ref on the box around it (children commit first), and Base UI looks again
// only when the prop changes, which a ref never does, so a ref sends the popup to `<body>` for good.
// `null`, while the box mounts, makes Base UI wait for it. A client component: it is a React context.
"use client";

import { createContext, useContext, type ReactNode } from "react";

/** The box's element; `null` while it mounts (Base UI waits); `undefined` for `<body>`. */
type PortalContainer = HTMLElement | null | undefined;

const PortalContainerContext = createContext<PortalContainer>(undefined);

/** Points the portals of the overlays below it at `container`. */
function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return <PortalContainerContext value={container}>{children}</PortalContainerContext>;
}

/** The container a primitive's portal renders into: the box, or `undefined` for `<body>`. */
function usePortalContainer(): PortalContainer {
  return useContext(PortalContainerContext);
}

export { PortalContainerProvider, usePortalContainer };
