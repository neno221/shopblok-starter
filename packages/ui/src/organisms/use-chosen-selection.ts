// Ours (T38; split from `buy-box-choice.ts` in T49, so a server component can import the rules
// without a hook). The buy box's and the quick view's choice in state, following the `selection`
// prop with React's "storing information from previous renders" pattern (see `buy-box-choice.ts`).
import type { VariantSelection } from "@shopblok/registry/contracts";
import { useState } from "react";
import { sameSelection } from "./buy-box-choice";

/**
 * The choice, in state. It starts as `selection` and becomes the prop's again whenever the prop
 * changes to another choice; a change the shopper makes is `setChosen`.
 */
export function useChosenSelection(selection: VariantSelection) {
  const [chosen, setChosen] = useState(selection);
  const [followed, setFollowed] = useState(selection);
  if (followed !== selection && !sameSelection(followed, selection)) {
    setFollowed(selection);
    setChosen(selection);
  }
  return [chosen, setChosen] as const;
}
