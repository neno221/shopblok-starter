/**
 * The cart badge's classes, shared by CartButton, CartDrawer and QuickCartDropdown (T45): on the
 * icon's corner and out of the flow, so the button keeps its size when the number arrives; hidden
 * from pointer events (the button under it takes the click). Its own module, with no import, so
 * the client islands that take only the look do not bundle `cart-badge.ts`'s formatter.
 */
export const cartBadgeClassName =
  "pointer-events-none absolute -end-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background";
