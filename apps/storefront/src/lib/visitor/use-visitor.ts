import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type VisitorSnapshot } from "./store";

/**
 * The visitor as the browser knows it (D44): "unknown" during the server render and during
 * hydration, then the store's value, and again after each change. A client component's hook.
 */
export function useVisitor(): VisitorSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
