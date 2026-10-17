// Vendored from shadcn/ui (`shadcn add navigation-menu`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): triggers and links are at least 44
// px tall (`min-h-11`, D32) and wrap a long label (no `w-max`); the focus ring is full strength
// (D35), and the rule that switched it off inside the content is gone; the positioner's `side`
// takes the logical `inline-start` and `inline-end`; the positioner sits on the `--z-popover` layer
// and its portal goes to `usePortalContainer()` (D45); logical properties; light only (no `dark:`).
// Dead Radix classes are removed (`data-motion`, `data-viewport`, `xs:`, `easing-`), the content's
// slide uses Base UI's `data-activation-direction` in the syntax Tailwind reads, and the active
// link is `data-active` (Base UI sets no `data-active="true"`).
// A client component: the positioner reads the portal-container context, and Base UI's
// NavigationMenu keeps the open state and the hover and focus handling. It follows that
// `navigationMenuTriggerStyle` can only be called from client code.
// Edited again (SETUP.md, "Navigation and headers (T35)") for the mega menu: the popup is a `div`,
// because Base UI draws it as a second `<nav>`, which the trigger's `aria-owns` puts inside the
// root's own landmark; `fullWidth` anchors the positioner to the menu's root (or to the ancestor
// `fullWidthAnchor` names, PR 57 review) instead of the trigger and makes the panel as wide, so a mega menu spans its row while a dropdown
// next to it keeps its narrow panel under its trigger (the page switches the prop with the open
// item); `positionerClassName`, `popupClassName`, `sideOffset` and `collisionAvoidance` reach the
// positioner and the popup that `NavigationMenu` draws itself; and nothing slides or fades over
// time under `prefers-reduced-motion` (`motion-reduce:transition-none` on the positioner, the popup
// and the content).
"use client";

import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";
import { usePortalContainer } from "@shopblok/ui/primitives/portal-container";
import { ChevronDownIcon } from "lucide-react";

type LogicalSide = Exclude<NavigationMenuPrimitive.Positioner.Props["side"], "left" | "right">;

type NavigationMenuProps = Omit<NavigationMenuPrimitive.Root.Props, "ref"> &
  Pick<NavigationMenuPrimitive.Positioner.Props, "align" | "sideOffset" | "collisionAvoidance"> & {
    /**
     * The panel is as wide as the menu's root and sits below it, not under the open trigger (a mega
     * menu). The caller gives the root the width of its row. It can change with the open item.
     */
    fullWidth?: boolean;
    /**
     * A selector for an ancestor of the root that a `fullWidth` panel spans instead of the root (a
     * header's row, when the menu is only one column of it). Without a match, the root.
     */
    fullWidthAnchor?: string;
    /** Classes for the positioner `NavigationMenu` draws. */
    positionerClassName?: string;
    /** Classes for the popup `NavigationMenu` draws. */
    popupClassName?: string;
  };

// `ref` is the root's own (the positioner of a `fullWidth` menu is anchored to it), so a caller's
// would be dropped: the type refuses it.
function NavigationMenu({
  align = "start",
  sideOffset,
  collisionAvoidance,
  fullWidth = false,
  fullWidthAnchor,
  positionerClassName,
  popupClassName,
  className,
  children,
  ...props
}: NavigationMenuProps) {
  // In state, not a ref: the positioner reads the element when it renders, after this one commits.
  const [root, setRoot] = React.useState<HTMLElement | null>(null);
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
      ref={setRoot}
    >
      {children}
      <NavigationMenuPositioner
        align={align}
        sideOffset={sideOffset}
        collisionAvoidance={collisionAvoidance}
        fullWidth={fullWidth}
        anchor={
          fullWidth
            ? ((fullWidthAnchor === undefined
                ? null
                : root?.parentElement?.closest<HTMLElement>(fullWidthAnchor)) ?? root)
            : undefined
        }
        className={positionerClassName}
        popupClassName={popupClassName}
      />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-0", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-center text-sm font-medium transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted data-open:bg-muted/50 data-open:hover:bg-muted data-open:focus:bg-muted",
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-px ms-1 size-3 shrink-0 transition duration-300 group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "h-full w-auto p-2 pe-2.5 transition-[opacity,transform,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0 data-starting-style:data-[activation-direction=left]:translate-x-[-50%] data-starting-style:data-[activation-direction=right]:translate-x-[50%] data-ending-style:data-[activation-direction=left]:translate-x-[50%] data-ending-style:data-[activation-direction=right]:translate-x-[-50%]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A `fullWidth` panel stays under its row whatever is open: it never flips above it or shifts
 * sideways, and its room to the screen's edges is the whole width.
 */
const FULL_WIDTH_COLLISION_AVOIDANCE = {
  side: "none",
  align: "none",
  fallbackAxisSide: "none",
} as const;
const FULL_WIDTH_COLLISION_PADDING = { top: 0, right: 0, bottom: 8, left: 0 } as const;

function NavigationMenuPositioner({
  className,
  popupClassName,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  fullWidth = false,
  collisionAvoidance,
  ...props
}: Omit<NavigationMenuPrimitive.Positioner.Props, "side"> & {
  side?: LogicalSide;
  /** As wide as the anchor (the menu's root, when `NavigationMenu` passes it), not as its content. */
  fullWidth?: boolean;
  /** Classes for the popup inside the positioner. */
  popupClassName?: string;
}) {
  const container = usePortalContainer();
  return (
    <NavigationMenuPrimitive.Portal container={container}>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionAvoidance={fullWidth ? FULL_WIDTH_COLLISION_AVOIDANCE : collisionAvoidance}
        collisionPadding={fullWidth ? FULL_WIDTH_COLLISION_PADDING : undefined}
        className={cn(
          "isolate z-(--z-popover) h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none data-instant:transition-none data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:top-[-10px]",
          // The anchor's width is Base UI's own variable on the positioner; the height follows the
          // popup, because Base UI measures the popup before the width is known.
          fullWidth && "h-auto w-(--anchor-width)",
          className,
        )}
        {...props}
      >
        {/* A `div`: Base UI's popup is a second `<nav>`, and the root is the landmark. */}
        <NavigationMenuPrimitive.Popup
          render={<div />}
          className={cn(
            "relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow ring-1 ring-foreground/10 transition-[opacity,transform,width,height,scale,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none motion-reduce:transition-none data-ending-style:scale-90 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-90 data-starting-style:opacity-0",
            fullWidth && "h-auto w-full",
            popupClassName,
          )}
        >
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-md p-2 text-sm transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring in-data-[slot=navigation-menu-content]:rounded-sm data-active:bg-muted/50 data-active:hover:bg-muted data-active:focus:bg-muted [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-[2px] bg-border shadow-md" />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
};
