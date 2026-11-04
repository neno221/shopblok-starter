import { useLayoutEffect, useRef, useState, type SetStateAction } from "react";

import { refusalOnEdit } from "./refusal";

/** The part of a react-query mutation the drawers' fields need. */
type Save = { isError: boolean; isPending: boolean; reset: () => void };

/**
 * A drawer's fields (W6 item 5): `field(initial)` is `useState` whose setter first clears the save's
 * refusal (`refusalOnEdit`), so no field can skip it. A change made while the save is on its way
 * clears the refusal as soon as it comes back, before it is painted.
 */
export function useRefusalClearing(save: Save) {
  const editedWhilePending = useRef(false);
  useLayoutEffect(() => {
    if (save.isError && editedWhilePending.current) save.reset();
    if (!save.isPending) editedWhilePending.current = false;
  }, [save, save.isError, save.isPending]);

  const edited = () => {
    const action = refusalOnEdit(save);
    if (action === "reset") save.reset();
    else if (action === "remember") editedWhilePending.current = true;
  };

  /** `useState`, with the refusal cleared by every change. Call it in the same order each render. */
  const useField = <T>(initial: T | (() => T)) => {
    const [value, setValue] = useState<T>(initial);
    const set = (next: SetStateAction<T>) => {
      edited();
      setValue(next);
    };
    return [value, set] as const;
  };
  return useField;
}
