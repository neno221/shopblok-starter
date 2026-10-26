/**
 * The `initialFocus` of a popup given `defaultOpen` (a dialog, a sheet, a popover): no focus when
 * it opens by itself (the interaction type is empty), the default (the first control's) when a
 * reader opens it later. Several open states on one design-system page would otherwise take focus
 * from each other, and a popup that is not modal closes when focus leaves it.
 */
export const takesFocusWhenOpenedByAReader = (interaction: string) => interaction !== "";
