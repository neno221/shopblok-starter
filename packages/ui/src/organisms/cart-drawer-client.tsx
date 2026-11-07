// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). Where the drawer's client part was until T79:
// it is the `drawer` member's own now (`./mini-cart/drawer-client.tsx`, D99), and this path stays
// for its importers.
export { CartDrawerClient } from "./mini-cart/drawer-client";
export type { CartDrawerClientProps } from "./mini-cart/drawer-client";
