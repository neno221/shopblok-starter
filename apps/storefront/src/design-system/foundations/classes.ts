// Tailwind finds a class only where it is written out, so the steps of the scales below map to
// literal class names. `classes.test.ts` fails when `@shopblok/ui/tokens` gains a step that has no
// class here, so a token cannot be added to the system and missed by its page.

/** `radius.steps[].step` → the utility. */
export const radiusClasses = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  "4xl": "rounded-4xl",
} as const satisfies Record<string, string>;

/** `shadows[].name` → the utility. */
export const shadowClasses = {
  "2xs": "shadow-2xs",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
} as const satisfies Record<string, string>;

/** `text[].step` → the utility (size and line height). */
export const textClasses = {
  "2xs": "text-2xs",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
  "7xl": "text-7xl",
  "8xl": "text-8xl",
  "9xl": "text-9xl",
} as const satisfies Record<string, string>;

/** The weights `tokens.css` sets (`--font-weight-*`), and the utility for each. */
export const weightClasses = [
  { name: "normal", className: "font-normal" },
  { name: "medium", className: "font-medium" },
  { name: "semibold", className: "font-semibold" },
  { name: "bold", className: "font-bold" },
] as const;

/** `--spacing` is 0.25rem (Tailwind's step): the 4 px that `spacing.test.ts` checks in tokens.css. */
export const SPACING_STEP_PX = 4;

/** The spacing steps shown: a step `n` is `n × --spacing`, and the class is `w-{n}`. */
export const spacingSteps = [
  { step: "0.5", multiple: 0.5, className: "w-0.5" },
  { step: "1", multiple: 1, className: "w-1" },
  { step: "2", multiple: 2, className: "w-2" },
  { step: "3", multiple: 3, className: "w-3" },
  { step: "4", multiple: 4, className: "w-4" },
  { step: "6", multiple: 6, className: "w-6" },
  { step: "8", multiple: 8, className: "w-8" },
  { step: "11", multiple: 11, className: "w-11" },
  { step: "12", multiple: 12, className: "w-12" },
  { step: "16", multiple: 16, className: "w-16" },
  { step: "24", multiple: 24, className: "w-24" },
] as const;

/** The motion tokens: `--duration-*` in :root (read in the browser) and the utility that uses each. */
export const durations = [
  {
    name: "fast",
    variable: "--duration-fast",
    className: "duration-(--duration-fast)",
  },
  {
    name: "base",
    variable: "--duration-base",
    className: "duration-(--duration-base)",
  },
  {
    name: "slow",
    variable: "--duration-slow",
    className: "duration-(--duration-slow)",
  },
] as const;

/** `zIndex[].name` → what the layer is for, in one phrase. */
export const layerNotes: Record<string, string> = {
  sticky: "Sticky bars inside the page",
  header: "The site header",
  dropdown: "Menus and selects",
  overlay: "The scrim behind a modal",
  modal: "Dialogs and drawers",
  popover: "Popovers and tooltips",
  toast: "Notifications",
};
